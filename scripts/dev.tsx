#!/usr/bin/env bun
import React from "react";
import { render, Text, Box, useInput } from "ink";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ServiceState = "stopped" | "starting" | "running" | "error";

export interface Service {
  id: string;
  label: string;
  port: number | null;
  cmd: string[];
}

export interface Group {
  id: string;
  label: string;
  children: Service[];
}

export interface LogLine {
  time: string; // "HH:MM:SS"
  serviceId: string;
  text: string;
  level: "info" | "error";
}

// ── Service registry ──────────────────────────────────────────────────────────

const SERVICES: Group[] = [
  {
    id: "analytics",
    label: "analytics",
    children: [
      {
        id: "analytics-frontend",
        label: "frontend",
        port: 5173,
        cmd: ["bun", "run", "dev"],
      },
      {
        id: "analytics-backend",
        label: "backend",
        port: 8000,
        cmd: ["uv", "run", "serve"],
      },
    ],
  },
  {
    id: "simulator",
    label: "simulator",
    children: [
      {
        id: "simulator-studio",
        label: "studio",
        port: 5180,
        cmd: ["bun", "run", "dev:simulator"],
      },
      {
        id: "simulator-api",
        label: "api",
        port: 8001,
        cmd: ["uv", "run", "simulator-serve"],
      },
    ],
  },
  {
    id: "design-docs",
    label: "design-docs",
    children: [
      {
        id: "design-docs-frontend",
        label: "frontend",
        port: 5174,
        cmd: ["bun", "run", "--filter", "@stratif-io/design-docs", "dev"],
      },
      {
        id: "design-sys-watch",
        label: "design-sys",
        port: null,
        cmd: ["bun", "run", "build:lib:watch"],
      },
    ],
  },
  {
    id: "docs",
    label: "docs",
    children: [
      {
        id: "docs-frontend",
        label: "frontend",
        port: 4321,
        cmd: ["bun", "run", "--filter", "@stratif-io/docs", "dev"],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8); // "HH:MM:SS"
}

function allServices(): Service[] {
  return SERVICES.flatMap((g) => g.children);
}

function groupState(
  group: Group,
  states: Map<string, ServiceState>,
): ServiceState {
  const priority: ServiceState[] = ["error", "stopped", "starting", "running"];
  for (const p of priority) {
    if (group.children.some((s) => states.get(s.id) === p)) return p;
  }
  return "stopped";
}

// ── Process manager ───────────────────────────────────────────────────────────

const MAX_LOG_LINES = 500;

type OnLogLine = (line: LogLine) => void;
type OnStateChange = (serviceId: string, state: ServiceState) => void;

class ProcessManager {
  private procs = new Map<string, ReturnType<typeof Bun.spawn>>();
  private onLog: OnLogLine;
  private onState: OnStateChange;

  constructor(onLog: OnLogLine, onState: OnStateChange) {
    this.onLog = onLog;
    this.onState = onState;
  }

  async start(service: Service): Promise<void> {
    if (this.procs.has(service.id)) return;
    this.onState(service.id, "starting");

    const proc = Bun.spawn(service.cmd, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });

    this.procs.set(service.id, proc);

    const stream = (
      reader: ReadableStream<Uint8Array>,
      level: "info" | "error",
    ) => {
      const decoder = new TextDecoder();
      const r = reader.getReader();
      let buf = "";
      const pump = async () => {
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          buf += decoder.decode(value);
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (line.trim()) {
              this.onLog({
                time: timestamp(),
                serviceId: service.id,
                text: line,
                level,
              });
            }
          }
        }
      };
      pump().catch(() => {});
    };

    stream(proc.stdout, "info");
    stream(proc.stderr, "error");

    proc.exited.then((code) => {
      this.procs.delete(service.id);
      this.onState(service.id, code === 0 ? "stopped" : "error");
    });

    setTimeout(() => {
      if (this.procs.has(service.id)) {
        this.onState(service.id, "running");
      }
    }, 800);
  }

  async stop(service: Service): Promise<void> {
    const proc = this.procs.get(service.id);
    if (!proc) return;
    proc.kill("SIGTERM");
    await proc.exited;
    this.procs.delete(service.id);
    this.onState(service.id, "stopped");
  }

  async startGroup(group: Group): Promise<void> {
    for (const svc of group.children) {
      await this.start(svc);
    }
  }

  async stopGroup(group: Group): Promise<void> {
    for (const svc of [...group.children].reverse()) {
      await this.stop(svc);
    }
  }

  async startAll(): Promise<void> {
    for (const group of SERVICES) {
      await this.startGroup(group);
    }
  }

  async stopAll(): Promise<void> {
    for (const group of [...SERVICES].reverse()) {
      await this.stopGroup(group);
    }
  }

  async quit(): Promise<void> {
    await this.stopAll();
    process.exit(0);
  }
}

// ── Tree navigation helpers ───────────────────────────────────────────────────

type TreeItem =
  | { kind: "group"; group: Group }
  | { kind: "service"; group: Group; service: Service };

function buildTree(): TreeItem[] {
  const items: TreeItem[] = [];
  for (const group of SERVICES) {
    items.push({ kind: "group", group });
    for (const service of group.children) {
      items.push({ kind: "service", group, service });
    }
  }
  return items;
}

const TREE = buildTree();

function stateDot(state: ServiceState): string {
  if (state === "running") return "●";
  if (state === "starting") return "◌";
  if (state === "error") return "●";
  return "○";
}

function stateColor(state: ServiceState): string {
  if (state === "running") return "green";
  if (state === "starting") return "yellow";
  if (state === "error") return "red";
  return "gray";
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 28;

interface SidebarProps {
  states: Map<string, ServiceState>;
  cursor: number;
}

const Sidebar = React.memo(function Sidebar({ states, cursor }: SidebarProps) {
  return (
    <Box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      borderRight
      borderColor="gray"
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold dimColor>
          SERVICES
        </Text>
      </Box>
      {TREE.map((item, i) => {
        const isSelected = cursor === i;

        if (item.kind === "group") {
          const gs = groupState(item.group, states);
          const label = item.group.label.padEnd(14);
          return (
            <Box key={item.group.id} paddingX={1}>
              <Text
                backgroundColor={isSelected ? "blue" : undefined}
                color={isSelected ? "white" : "cyan"}
                bold
              >
                {`${isSelected ? "▶" : " "} ${label}`}
              </Text>
              <Text
                backgroundColor={isSelected ? "blue" : undefined}
                color={stateColor(gs)}
              >
                {stateDot(gs)}
              </Text>
            </Box>
          );
        }

        const isLast =
          item.group.children[item.group.children.length - 1]?.id ===
          item.service.id;
        const ss = states.get(item.service.id) ?? "stopped";
        const portStr = item.service.port ? `:${item.service.port}` : "  watch";
        const prefix = isLast ? "  └─" : "  ├─";
        const label = `${prefix} ${item.service.label}`.padEnd(16);

        return (
          <Box key={item.service.id} paddingX={1}>
            <Text
              backgroundColor={isSelected ? "blue" : undefined}
              color={isSelected ? "white" : "white"}
              dimColor={!isSelected}
            >
              {`${isSelected ? "▶" : " "}${label}`}
            </Text>
            <Text
              backgroundColor={isSelected ? "blue" : undefined}
              color="gray"
              dimColor
            >
              {portStr}{" "}
            </Text>
            <Text
              backgroundColor={isSelected ? "blue" : undefined}
              color={stateColor(ss)}
            >
              {stateDot(ss)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
});

// ── Log colours ───────────────────────────────────────────────────────────────

const SERVICE_COLORS: Record<string, string> = {
  "analytics-frontend": "blue",
  "analytics-backend": "cyan",
  "simulator-studio": "magenta",
  "simulator-api": "yellow",
  "design-docs-frontend": "green",
  "design-sys-watch": "greenBright",
  "docs-frontend": "white",
};

// ── LogPane ───────────────────────────────────────────────────────────────────

interface LogPaneProps {
  logs: LogLine[];
  cursor: number;
  scrollOffset: number;
}

function getFilterIds(cursor: number): string[] | null {
  const item = TREE[cursor];
  if (!item) return null;
  if (item.kind === "group") return item.group.children.map((s) => s.id);
  return [item.service.id];
}

const LogPane = React.memo(function LogPane({
  logs,
  cursor,
  scrollOffset,
}: LogPaneProps) {
  const filterIds = getFilterIds(cursor);
  const visible = filterIds
    ? logs.filter((l) => filterIds.includes(l.serviceId))
    : logs;

  const maxVisible = 20;
  const start = Math.max(0, visible.length - maxVisible - scrollOffset);
  const slice = visible.slice(start, start + maxVisible);

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {slice.map((line, i) => (
        <Box key={i}>
          <Text color="gray">{line.time} </Text>
          <Text color={SERVICE_COLORS[line.serviceId] ?? "white"} bold>
            [{line.serviceId}]{" "}
          </Text>
          <Text color={line.level === "error" ? "red" : "white"}>
            {line.text}
          </Text>
        </Box>
      ))}
      {slice.length === 0 && (
        <Text color="gray" dimColor>
          {" "}
          no output yet
        </Text>
      )}
    </Box>
  );
});

// ── StatusBar ─────────────────────────────────────────────────────────────────

const HINTS =
  "↑↓ select  s start  x stop  r restart  A start-all  X stop-all  c clear  q quit";

function StatusBar() {
  return (
    <Box borderTop borderColor="gray" paddingX={1}>
      <Text dimColor>{HINTS}</Text>
    </Box>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [states, setStates] = React.useState<Map<string, ServiceState>>(
    () => new Map(allServices().map((s) => [s.id, "stopped"])),
  );
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [scrollOffset, setScrollOffset] = React.useState(0);

  // Buffer for incoming log lines — flushed on interval to batch renders
  const logBuffer = React.useRef<LogLine[]>([]);

  const mgr = React.useMemo(
    () =>
      new ProcessManager(
        (line) => {
          logBuffer.current.push(line);
        },
        (id, state) => setStates((prev) => new Map(prev).set(id, state)),
      ),
    [],
  );

  React.useEffect(() => {
    const t = setInterval(() => {
      if (logBuffer.current.length > 0) {
        const incoming = logBuffer.current.splice(0);
        setLogs((prev) => {
          const next = [...prev, ...incoming];
          return next.length > MAX_LOG_LINES
            ? next.slice(-MAX_LOG_LINES)
            : next;
        });
        setScrollOffset(0);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  useInput((input, key) => {
    if (key.upArrow && key.shift) {
      setScrollOffset((o) => o + 1);
      return;
    }
    if (key.downArrow && key.shift) {
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(TREE.length - 1, c + 1));
      return;
    }

    const item = TREE[cursor];
    if (!item) return;

    if (input === "s") {
      if (item.kind === "group") mgr.startGroup(item.group);
      else mgr.start(item.service);
    }
    if (input === "x") {
      if (item.kind === "group") mgr.stopGroup(item.group);
      else mgr.stop(item.service);
    }
    if (input === "r") {
      if (item.kind === "group") {
        mgr.stopGroup(item.group).then(() => mgr.startGroup(item.group));
      } else {
        mgr.stop(item.service).then(() => mgr.start(item.service));
      }
    }
    if (input === "A") mgr.startAll();
    if (input === "X") mgr.stopAll();
    if (input === "c") setLogs([]);
    if (input === "q") mgr.quit();
  });

  const rows = process.stdout.rows ?? 24;

  return (
    <Box flexDirection="column" height={rows}>
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar states={states} cursor={cursor} />
        <LogPane logs={logs} cursor={cursor} scrollOffset={scrollOffset} />
      </Box>
      <StatusBar />
    </Box>
  );
}

render(<App />, { exitOnCtrlC: true });
