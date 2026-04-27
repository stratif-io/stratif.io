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

const SPINNER_FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

function stateDot(state: ServiceState, frame: number): string {
  if (state === "running") return "●";
  if (state === "starting") return SPINNER_FRAMES[frame % 10]!;
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

interface SidebarProps {
  states: Map<string, ServiceState>;
  cursor: number;
  spinFrame: number;
}

function Sidebar({ states, cursor, spinFrame }: SidebarProps) {
  return (
    <Box
      flexDirection="column"
      width={26}
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      <Text bold color="gray">
        SERVICES
      </Text>
      {TREE.map((item, i) => {
        const isSelected = cursor === i;
        const bg = isSelected ? "blue" : undefined;

        if (item.kind === "group") {
          const gs = groupState(item.group, states);
          return (
            <Box key={item.group.id}>
              <Text backgroundColor={bg} color="white" bold>
                {isSelected ? "▶ " : "  "}
              </Text>
              <Text
                backgroundColor={bg}
                color={isSelected ? "white" : "cyan"}
                bold
              >
                {item.group.label}
              </Text>
              <Text backgroundColor={bg} color={stateColor(gs)}>
                {" "}
                {stateDot(gs, spinFrame)}
              </Text>
            </Box>
          );
        }

        // service row
        const isLast =
          item.group.children[item.group.children.length - 1]?.id ===
          item.service.id;
        const ss = states.get(item.service.id) ?? "stopped";
        const portStr = item.service.port ? `:${item.service.port}` : "watch";
        const prefix = isLast ? "  └─" : "  ├─";

        return (
          <Box key={item.service.id}>
            <Text backgroundColor={bg} color="gray">
              {isSelected ? "▶" : " "}
              {prefix}{" "}
            </Text>
            <Text backgroundColor={bg} color="white">
              {item.service.label}
            </Text>
            <Text backgroundColor={bg} color="gray">
              {" "}
              {portStr}{" "}
            </Text>
            <Text backgroundColor={bg} color={stateColor(ss)}>
              {stateDot(ss, spinFrame)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

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

function LogPane({ logs, cursor, scrollOffset }: LogPaneProps) {
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
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [states, setStates] = React.useState<Map<string, ServiceState>>(
    () => new Map(allServices().map((s) => [s.id, "stopped"])),
  );
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [spinFrame, setSpinFrame] = React.useState(0);
  const [scrollOffset, setScrollOffset] = React.useState(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mgr = React.useMemo(
    () =>
      new ProcessManager(
        (line) => {
          setLogs((prev) => {
            const next = [...prev, line];
            return next.length > MAX_LOG_LINES
              ? next.slice(-MAX_LOG_LINES)
              : next;
          });
          setScrollOffset(0);
        },
        (id, state) => setStates((prev) => new Map(prev).set(id, state)),
      ),
    [],
  );

  React.useEffect(() => {
    const t = setInterval(() => setSpinFrame((f) => f + 1), 80);
    return () => clearInterval(t);
  }, []);

  return (
    <Box flexDirection="row" height={process.stdout.rows ?? 24}>
      <Sidebar states={states} cursor={cursor} spinFrame={spinFrame} />
      <LogPane logs={logs} cursor={cursor} scrollOffset={scrollOffset} />
    </Box>
  );
}

render(<App />, { exitOnCtrlC: true });
