#!/usr/bin/env bun

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceState = "stopped" | "starting" | "running" | "error";

interface Service {
  id: string;
  label: string;
  port: number | null;
  cmd: string[];
}

interface Group {
  id: string;
  label: string;
  children: Service[];
}

interface LogLine {
  time: string;
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
  return new Date().toTimeString().slice(0, 8);
}

function allServices(): Service[] {
  return SERVICES.flatMap((g) => g.children);
}

function groupState(
  group: Group,
  states: Map<string, ServiceState>,
): ServiceState {
  for (const p of [
    "error",
    "stopped",
    "starting",
    "running",
  ] as ServiceState[]) {
    if (group.children.some((s) => states.get(s.id) === p)) return p;
  }
  return "stopped";
}

// ── Tree ──────────────────────────────────────────────────────────────────────

type TreeItem =
  | { kind: "group"; group: Group }
  | { kind: "service"; group: Group; service: Service };

function buildTree(): TreeItem[] {
  const items: TreeItem[] = [];
  for (const group of SERVICES) {
    items.push({ kind: "group", group });
    for (const svc of group.children)
      items.push({ kind: "service", group, service: svc });
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

// ── Process manager ───────────────────────────────────────────────────────────

const MAX_LOG_LINES = 2000;

type OnLog = (line: LogLine) => void;
type OnState = (id: string, state: ServiceState) => void;

class ProcessManager {
  private procs = new Map<string, ReturnType<typeof Bun.spawn>>();

  constructor(
    private onLog: OnLog,
    private onState: OnState,
  ) {}

  async start(svc: Service): Promise<void> {
    if (this.procs.has(svc.id)) return;
    this.onState(svc.id, "starting");
    const proc = Bun.spawn(svc.cmd, {
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd(),
    });
    this.procs.set(svc.id, proc);

    const stream = (
      reader: ReadableStream<Uint8Array>,
      level: "info" | "error",
    ) => {
      const dec = new TextDecoder();
      const r = reader.getReader();
      let buf = "";
      const pump = async () => {
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          buf += dec.decode(value);
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines)
            if (line.trim())
              this.onLog({
                time: timestamp(),
                serviceId: svc.id,
                text: line,
                level,
              });
        }
      };
      pump().catch(() => {});
    };

    stream(proc.stdout, "info");
    stream(proc.stderr, "error");
    proc.exited.then((code) => {
      this.procs.delete(svc.id);
      this.onState(svc.id, code === 0 ? "stopped" : "error");
    });
    setTimeout(() => {
      if (this.procs.has(svc.id)) this.onState(svc.id, "running");
    }, 800);
  }

  async stop(svc: Service): Promise<void> {
    const proc = this.procs.get(svc.id);
    if (!proc) return;
    const pid = proc.pid;
    // Kill children first (e.g. Vite spawned by bun), then the parent
    try {
      Bun.spawnSync(["pkill", "-TERM", "-P", String(pid)]);
    } catch {}
    proc.kill("SIGTERM");
    // Force kill after 3s if still alive
    const forceKill = setTimeout(() => {
      try {
        Bun.spawnSync(["pkill", "-KILL", "-P", String(pid)]);
      } catch {}
      try {
        proc.kill("SIGKILL");
      } catch {}
    }, 3000);
    await proc.exited;
    clearTimeout(forceKill);
    this.procs.delete(svc.id);
    this.onState(svc.id, "stopped");
  }

  async startGroup(g: Group) {
    for (const svc of g.children) await this.start(svc);
  }
  async stopGroup(g: Group) {
    for (const svc of [...g.children].reverse()) await this.stop(svc);
  }
  async startAll() {
    for (const g of SERVICES) await this.startGroup(g);
  }
  async stopAll() {
    for (const g of [...SERVICES].reverse()) await this.stopGroup(g);
  }
  async quit() {
    cleanup();
    await this.stopAll();
    process.exit(0);
  }
}

// ── Double-buffer screen renderer ─────────────────────────────────────────────

type Color =
  | "default"
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

interface Cell {
  ch: string;
  fg: Color;
  bg: Color;
  bold: boolean;
  dim: boolean;
}

const FG: Record<Color, number> = {
  default: 39,
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  gray: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};
const BG: Record<Color, number> = {
  default: 49,
  black: 40,
  red: 41,
  green: 42,
  yellow: 43,
  blue: 44,
  magenta: 45,
  cyan: 46,
  white: 47,
  gray: 100,
  brightRed: 101,
  brightGreen: 102,
  brightYellow: 103,
  brightBlue: 104,
  brightMagenta: 105,
  brightCyan: 106,
  brightWhite: 107,
};

const BLANK: Cell = {
  ch: " ",
  fg: "default",
  bg: "default",
  bold: false,
  dim: false,
};

class Screen {
  cols = process.stdout.columns ?? 80;
  rows = process.stdout.rows ?? 24;
  private next: Cell[][];
  private curr: Cell[][];

  constructor() {
    this.next = this.alloc();
    this.curr = this.alloc();
  }

  private alloc() {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({ ...BLANK })),
    );
  }

  clear() {
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) this.next[y]![x] = { ...BLANK };
  }

  put(x: number, y: number, text: string, style: Partial<Cell> = {}) {
    if (y < 0 || y >= this.rows) return;
    const fg = style.fg ?? "default";
    const bg = style.bg ?? "default";
    const bold = style.bold ?? false;
    const dim = style.dim ?? false;
    for (let i = 0; i < text.length; i++) {
      const cx = x + i;
      if (cx < 0 || cx >= this.cols) continue;
      this.next[y]![cx] = { ch: text[i]!, fg, bg, bold, dim };
    }
  }

  fill(x: number, y: number, w: number, h: number, style: Partial<Cell> = {}) {
    for (let row = y; row < y + h; row++)
      this.put(
        x,
        row,
        " ".repeat(Math.max(0, Math.min(w, this.cols - x))),
        style,
      );
  }

  flush() {
    let out = "";
    let cFg: Color = "default",
      cBg: Color = "default",
      cBold = false,
      cDim = false;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const n = this.next[y]![x]!;
        const c = this.curr[y]![x]!;
        if (
          n.ch === c.ch &&
          n.fg === c.fg &&
          n.bg === c.bg &&
          n.bold === c.bold &&
          n.dim === c.dim
        )
          continue;

        out += `\x1b[${y + 1};${x + 1}H`;

        const needReset = (cBold && !n.bold) || (cDim && !n.dim);
        if (needReset) {
          out += "\x1b[0m";
          cFg = "default";
          cBg = "default";
          cBold = false;
          cDim = false;
        }
        if (n.bold && !cBold) {
          out += "\x1b[1m";
          cBold = true;
        }
        if (n.dim && !cDim) {
          out += "\x1b[2m";
          cDim = true;
        }
        if (n.fg !== cFg) {
          out += `\x1b[${FG[n.fg]}m`;
          cFg = n.fg;
        }
        if (n.bg !== cBg) {
          out += `\x1b[${BG[n.bg]}m`;
          cBg = n.bg;
        }

        out += n.ch;
        this.curr[y]![x] = { ...n };
      }
    }

    if (out) process.stdout.write(out + "\x1b[0m");
  }

  resize() {
    this.cols = process.stdout.columns ?? 80;
    this.rows = process.stdout.rows ?? 24;
    this.next = this.alloc();
    this.curr = this.alloc();
  }
}

// ── Drawing ───────────────────────────────────────────────────────────────────

// Sidebar column layout (width = 30, separator at col 30):
//   col 0:     left padding
//   col 1:     cursor glyph (▶ or space)
//   col 3-18:  label (16 chars, padded)
//   col 19-24: port right-aligned (6 chars: " :5173" or " watch")
//   col 26:    dot
//   col 30:    │ separator
const SIDEBAR_W = 30;

const SVC_COLOR: Record<string, Color> = {
  "analytics-frontend": "blue",
  "analytics-backend": "cyan",
  "simulator-studio": "magenta",
  "simulator-api": "yellow",
  "design-docs-frontend": "green",
  "design-sys-watch": "brightGreen",
  "docs-frontend": "brightWhite",
};

function dotColor(state: ServiceState): Color {
  if (state === "running") return "green";
  if (state === "starting") return "yellow";
  if (state === "error") return "red";
  return "gray";
}

function drawSidebar(
  s: Screen,
  states: Map<string, ServiceState>,
  cursor: number,
) {
  s.fill(0, 0, SIDEBAR_W, s.rows);
  s.put(2, 0, "SERVICES", { fg: "gray", bold: true });

  for (let y = 0; y < s.rows; y++) s.put(SIDEBAR_W, y, "│", { fg: "gray" });

  let row = 2;
  for (let i = 0; i < TREE.length; i++) {
    const item = TREE[i]!;
    const sel = cursor === i;
    const bg: Color = sel ? "blue" : "default";

    if (row >= s.rows - 2) break;

    if (item.kind === "group") {
      const gs = groupState(item.group, states);
      // col 1: cursor  col 3-24: label (padded)  col 26: dot
      s.fill(0, row, SIDEBAR_W, 1, { bg });
      s.put(1, row, sel ? "▶" : " ", { fg: "gray", bg });
      s.put(3, row, item.group.label.padEnd(22), {
        fg: sel ? "brightWhite" : "cyan",
        bg,
        bold: true,
      });
      s.put(26, row, stateDot(gs), { fg: dotColor(gs), bg });
      row++;
    } else {
      const isLast = item.group.children.at(-1)?.id === item.service.id;
      const ss = states.get(item.service.id) ?? "stopped";
      const prefix = isLast ? "  └─ " : "  ├─ ";
      // port: always 6 chars wide, space-padded left (" :5173" / " watch")
      const portStr = (
        item.service.port ? `:${item.service.port}` : " watch"
      ).padStart(6);
      // label: fixed 16 chars so port always lands at col 19
      const label = (prefix + item.service.label).slice(0, 16).padEnd(16);
      // col 1: cursor  col 3-18: label  col 19-24: port  col 26: dot
      s.fill(0, row, SIDEBAR_W, 1, { bg });
      s.put(1, row, sel ? "▶" : " ", { fg: "gray", bg });
      s.put(3, row, label, {
        fg: sel ? "brightWhite" : "white",
        bg,
        dim: !sel,
      });
      s.put(19, row, portStr, { fg: "gray", bg, dim: true });
      s.put(26, row, stateDot(ss), { fg: dotColor(ss), bg });
      row++;
      if (isLast && i < TREE.length - 1) row++; // blank spacer between groups
    }
  }
}

function drawLogPane(
  s: Screen,
  logs: LogLine[],
  cursor: number,
  scrollOffset: number,
) {
  const x0 = SIDEBAR_W + 1;
  const w = s.cols - x0 - 1;
  const h = s.rows - 2; // exclude separator + status bar

  const item = TREE[cursor];
  let visible = logs;
  if (item) {
    const ids =
      item.kind === "group"
        ? item.group.children.map((c) => c.id)
        : [item.service.id];
    visible = logs.filter((l) => ids.includes(l.serviceId));
  }

  if (visible.length === 0) {
    s.put(x0 + 2, 1, "no output yet", { fg: "gray", dim: true });
    return;
  }

  const start = Math.max(0, visible.length - h - scrollOffset);
  const slice = visible.slice(start, start + h);

  for (let i = 0; i < slice.length; i++) {
    const line = slice[i]!;
    const y = 1 + i;
    const timeTag = `${line.time} `;
    const svcTag = `[${line.serviceId}] `;
    const maxText = w - timeTag.length - svcTag.length;

    // Strip ANSI escape codes from piped process output so they don't corrupt our renderer
    const rawText = line.text.replace(/\x1b\[[0-9;]*m/g, "").slice(0, maxText);

    s.put(x0 + 1, y, timeTag, { fg: "gray", dim: true });
    s.put(x0 + 1 + timeTag.length, y, svcTag, {
      fg: SVC_COLOR[line.serviceId] ?? "white",
      bold: true,
    });
    s.put(x0 + 1 + timeTag.length + svcTag.length, y, rawText, {
      fg: line.level === "error" ? "red" : "white",
    });
  }
}

function drawStatusBar(s: Screen) {
  const sep = s.rows - 2;
  const bar = s.rows - 1;
  s.put(0, sep, "─".repeat(s.cols), { fg: "gray", dim: true });
  // Use plain ASCII arrows to avoid ambiguous-width Unicode rendering
  const hints =
    " up/dn select   s start   x stop   r restart   A start-all   X stop-all   c clear   q quit";
  s.put(0, bar, hints.slice(0, s.cols), { fg: "gray", dim: true });
}

// ── App state ─────────────────────────────────────────────────────────────────

const screen = new Screen();
const states = new Map<string, ServiceState>(
  allServices().map((s) => [s.id, "stopped"]),
);
let logs: LogLine[] = [];
let cursor = 0;
let scrollOffset = 0;
const logBuffer: LogLine[] = [];

function redraw() {
  screen.clear();
  drawSidebar(screen, states, cursor);
  drawLogPane(screen, logs, cursor, scrollOffset);
  drawStatusBar(screen);
  screen.flush();
}

const mgr = new ProcessManager(
  (line) => logBuffer.push(line),
  (id, state) => {
    states.set(id, state);
    redraw();
  },
);

// Flush log buffer — only source of timer-driven redraws
setInterval(() => {
  if (logBuffer.length === 0) return;
  const incoming = logBuffer.splice(0);
  logs = [...logs, ...incoming];
  if (logs.length > MAX_LOG_LINES) logs = logs.slice(-MAX_LOG_LINES);
  scrollOffset = 0;
  redraw();
}, 100);

// ── Keyboard ──────────────────────────────────────────────────────────────────

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");

process.stdin.on("data", (key: string) => {
  if (key === "\x03") {
    mgr.quit();
    return;
  } // Ctrl+C
  if (key === "\x1b[A") {
    cursor = Math.max(0, cursor - 1);
    redraw();
    return;
  }
  if (key === "\x1b[B") {
    cursor = Math.min(TREE.length - 1, cursor + 1);
    redraw();
    return;
  }
  if (key === "\x1b[1;2A") {
    scrollOffset++;
    redraw();
    return;
  }
  if (key === "\x1b[1;2B") {
    scrollOffset = Math.max(0, scrollOffset - 1);
    redraw();
    return;
  }

  const item = TREE[cursor];
  if (!item) return;

  if (key === "s") {
    item.kind === "group"
      ? mgr.startGroup(item.group)
      : mgr.start(item.service);
  } else if (key === "x") {
    item.kind === "group" ? mgr.stopGroup(item.group) : mgr.stop(item.service);
  } else if (key === "r") {
    if (item.kind === "group")
      mgr.stopGroup(item.group).then(() => mgr.startGroup(item.group));
    else mgr.stop(item.service).then(() => mgr.start(item.service));
  } else if (key === "A") mgr.startAll();
  else if (key === "X") mgr.stopAll();
  else if (key === "c") {
    logs = [];
    redraw();
  } else if (key === "q") mgr.quit();
});

// ── Init / cleanup ────────────────────────────────────────────────────────────

function cleanup() {
  process.stdout.write("\x1b[?25h\x1b[?1049l\x1b[0m"); // show cursor, leave alt screen, reset colors
}

process.on("exit", cleanup);
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGWINCH", () => {
  screen.resize();
  redraw();
});

process.stdout.write("\x1b[?1049h\x1b[2J\x1b[H\x1b[?25l"); // enter alt screen, clear, home, hide cursor
redraw();
