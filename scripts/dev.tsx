#!/usr/bin/env bun
import React from "react";
import { render, Text } from "ink";

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

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [states, setStates] = React.useState<Map<string, ServiceState>>(
    () => new Map(allServices().map((s) => [s.id, "stopped"])),
  );
  const [logs, setLogs] = React.useState<LogLine[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mgr = React.useMemo(
    () =>
      new ProcessManager(
        (line) =>
          setLogs((prev) => {
            const next = [...prev, line];
            return next.length > MAX_LOG_LINES
              ? next.slice(-MAX_LOG_LINES)
              : next;
          }),
        (id, state) => setStates((prev) => new Map(prev).set(id, state)),
      ),
    [],
  );

  return (
    <Text color="green">
      ProcessManager ready — {allServices().length} services, {logs.length} log
      lines
    </Text>
  );
}

render(<App />);
