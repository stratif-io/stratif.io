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

// ── Smoke test ────────────────────────────────────────────────────────────────

function App() {
  return <Text color="green">services: {SERVICES.length} groups</Text>;
}

render(<App />);
