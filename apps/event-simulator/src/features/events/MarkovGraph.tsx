import React, { useCallback, useMemo, useState } from "react";
import dagre from "dagre";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  useNodesState,
  useEdgesState,
  Panel,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@stratif-io/design-system";
import type { MarkovConfig } from "@/types/simulation";

interface Props {
  config: MarkovConfig;
  selectedNode?: string | null;
  onNodeSelect?: (name: string | null) => void;
}

const NODE_WIDTH = 148;
const NODE_HEIGHT = 38;
const END_NODE_ID = "__end__";

// ── Custom node ─────────────────────────────────────────────────────────────

type EventNodeData = {
  label: string;
  color: string;
  selected: boolean;
  isEnd?: boolean;
  isStart?: boolean;
  startWeight?: number;
};

function EventNode({ data }: NodeProps) {
  const d = data as EventNodeData;
  if (d.isEnd) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border-2 border-dashed text-xs font-medium transition-all",
          "bg-background/60 border-border text-muted-foreground",
        )}
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      >
        <Handle type="target" position={Position.Left} className="opacity-0" />
        [end]
        <Handle type="source" position={Position.Right} className="opacity-0" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all shadow-sm relative",
        d.selected
          ? "ring-2 ring-offset-1 ring-white/80 shadow-md"
          : "hover:shadow-md",
      )}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: d.color,
        color: "#fff",
        boxShadow: d.selected
          ? `0 0 0 3px ${d.color}66, 0 4px 12px ${d.color}44`
          : d.isStart
            ? `0 0 0 2px ${d.color}, 0 0 0 4px ${d.color}66, 0 4px 16px ${d.color}55`
            : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      {d.isStart ? (
        // Filled play triangle — session entry point indicator
        <svg
          width="8"
          height="10"
          viewBox="0 0 8 10"
          className="shrink-0"
          aria-hidden
        >
          <polygon points="0,0 8,5 0,10" fill="rgba(255,255,255,0.9)" />
        </svg>
      ) : (
        <span
          className="size-2 rounded-full bg-white/30 shrink-0"
          aria-hidden
        />
      )}
      <span className="truncate">{d.label}</span>
      {d.isStart && d.startWeight != null && d.startWeight < 1 && (
        <span className="ml-auto text-[9px] font-bold text-white/70 shrink-0">
          {Math.round(d.startWeight * 100)}%
        </span>
      )}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { eventNode: EventNode };

// ── Shared arrowhead (SVG polygon, avoids React Flow marker scaling issues) ──

function Arrowhead({
  x,
  y,
  dx,
  dy,
  size,
  color,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
}) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const halfW = size * 0.42;
  const tip = `${x},${y}`;
  const bl = `${x - ux * size - uy * halfW},${y - uy * size + ux * halfW}`;
  const br = `${x - ux * size + uy * halfW},${y - uy * size - ux * halfW}`;
  return <polygon points={`${tip} ${bl} ${br}`} fill={color} />;
}

function EdgeLabel({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: React.ReactNode;
}) {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
          fontSize: 10,
          fontWeight: 500,
          color: "#6b7280",
          background: "hsl(var(--background))",
          padding: "2px 5px",
          borderRadius: 3,
          pointerEvents: "none",
        }}
        className="nodrag nopan"
      >
        {label}
      </div>
    </EdgeLabelRenderer>
  );
}

// ── Self-loop edge ───────────────────────────────────────────────────────────

function SelfLoopEdge({
  sourceX,
  sourceY,
  style,
  label,
  labelBgPadding,
}: EdgeProps) {
  const ncx = sourceX - NODE_WIDTH / 2;
  const ncy = sourceY - NODE_HEIGHT / 2;
  const r = 32;
  const p0x = ncx - r * 0.6;
  const p0y = ncy;
  const p3x = ncx + r * 0.6;
  const p3y = ncy;
  const c1x = ncx - r;
  const c1y = ncy - r * 2.5;
  const c2x = ncx + r;
  const c2y = ncy - r * 2.5;
  const d = `M ${p0x} ${p0y} C ${c1x} ${c1y} ${c2x} ${c2y} ${p3x} ${p3y}`;
  // Tangent at t=1 for cubic bezier: 3*(P3 - C2)
  const arrowDx = p3x - c2x;
  const arrowDy = p3y - c2y;
  const stroke =
    (style as React.CSSProperties)?.stroke ?? "rgba(107,114,128,0.8)";
  const lpad = (labelBgPadding as number[] | undefined) ?? [5, 3];
  return (
    <>
      <path d={d} style={{ ...style, fill: "none" } as React.CSSProperties} />
      <Arrowhead
        x={p3x}
        y={p3y}
        dx={arrowDx}
        dy={arrowDy}
        size={10}
        color={stroke as string}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${ncx}px,${ncy - r * 2.6}px)`,
              fontSize: 10,
              fontWeight: 500,
              color: "#6b7280",
              background: "hsl(var(--background))",
              padding: `${lpad[1]}px ${lpad[0]}px`,
              borderRadius: 3,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ── Bidirectional edge (explicit perpendicular offset) ───────────────────────

function BiEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  label,
  data,
}: EdgeProps) {
  const sign = (data as { sign?: number })?.sign ?? 1;

  const isBackward = sourceX > targetX;
  const sx = isBackward ? sourceX - NODE_WIDTH : sourceX;
  const tx = isBackward ? targetX + NODE_WIDTH : targetX;

  const mx = (sx + tx) / 2;
  const my = (sourceY + targetY) / 2;
  const dx = tx - sx;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  const isNearVertical = Math.abs(dy) > Math.abs(dx) * 0.5;
  const OFFSET = isNearVertical ? 96 : 52;

  const effectiveSign = isBackward ? -sign : sign;
  const px = (-dy / len) * OFFSET * effectiveSign;
  const py = (dx / len) * OFFSET * effectiveSign;

  const cx = mx + px;
  const cy = my + py;
  const d = `M ${sx} ${sourceY} Q ${cx} ${cy} ${tx} ${targetY}`;
  const lx = 0.25 * sx + 0.5 * cx + 0.25 * tx;
  const ly = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
  // Tangent at t=1 for quadratic bezier: 2*(endpoint - control)
  const arrowDx = tx - cx;
  const arrowDy = targetY - cy;
  const stroke =
    (style as React.CSSProperties)?.stroke ?? "rgba(107,114,128,0.8)";

  return (
    <>
      <path d={d} style={{ ...style, fill: "none" } as React.CSSProperties} />
      <Arrowhead
        x={tx}
        y={targetY}
        dx={arrowDx}
        dy={arrowDy}
        size={10}
        color={stroke as string}
      />
      {label && <EdgeLabel x={lx} y={ly} label={label} />}
    </>
  );
}

// ── Straight (one-way) edge ──────────────────────────────────────────────────

function StraightEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  label,
}: EdgeProps) {
  const d = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const lx = (sourceX + targetX) / 2;
  const ly = (sourceY + targetY) / 2;
  const arrowDx = targetX - sourceX;
  const arrowDy = targetY - sourceY;
  const stroke =
    (style as React.CSSProperties)?.stroke ?? "rgba(107,114,128,0.8)";

  return (
    <>
      <path d={d} style={{ ...style, fill: "none" } as React.CSSProperties} />
      <Arrowhead
        x={targetX}
        y={targetY}
        dx={arrowDx}
        dy={arrowDy}
        size={10}
        color={stroke as string}
      />
      {label && <EdgeLabel x={lx} y={ly} label={label} />}
    </>
  );
}

const edgeTypes = {
  selfloop: SelfLoopEdge,
  biedge: BiEdge,
  straight: StraightEdge,
};

// ── Layout (dagre — left-to-right workflow) ───────────────────────────────────

function layoutNodes(
  config: MarkovConfig,
  showEnd: boolean,
  selected: string | null,
  startMap: Record<string, number>,
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    // network-simplex produces tighter, better-ordered ranks than the default
    ranker: "network-simplex",
    // greedy acyclicer reverses the minimum set of back-edges before ranking,
    // which reduces crossings in cyclic Markov graphs
    acyclicer: "greedy",
    nodesep: 52,
    ranksep: 112,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  config.events.forEach((ev) =>
    g.setNode(ev.name, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  if (showEnd)
    g.setNode(END_NODE_ID, { width: NODE_WIDTH, height: NODE_HEIGHT });

  // Feed edges with probability-based weights so high-traffic transitions pull
  // connected nodes into adjacent ranks, reducing long-range crossings.
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const target = to === "[end]" ? END_NODE_ID : to;
      if (!showEnd && target === END_NODE_ID) continue;
      if (g.hasNode(from) && g.hasNode(target)) {
        // weight nudges dagre to keep high-probability edges short (same rank)
        g.setEdge(from, target, { weight: Math.round(1 + prob * 9) });
      }
    }
  }

  dagre.layout(g);

  const nodes: Node[] = config.events.map((ev) => {
    const { x, y } = g.node(ev.name);
    const startWeight = startMap[ev.name];
    return {
      id: ev.name,
      type: "eventNode",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        label: ev.name,
        color: ev.color ?? "#6366f1",
        selected: ev.name === selected,
        isStart: startWeight != null && startWeight > 0,
        startWeight: startWeight ?? 0,
      },
    };
  });

  if (showEnd && g.hasNode(END_NODE_ID)) {
    const { x, y } = g.node(END_NODE_ID);
    nodes.push({
      id: END_NODE_ID,
      type: "eventNode",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { label: "[end]", color: "", selected: false, isEnd: true },
    });
  }

  return nodes;
}

function buildEdges(config: MarkovConfig, showEnd: boolean): Edge[] {
  // Pre-scan to find bidirectional pairs so we can curve them apart
  const pairSet = new Set<string>();
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const targetId = to === "[end]" ? END_NODE_ID : to;
      if (from !== targetId && config.transitions[targetId]?.[from]) {
        pairSet.add([from, targetId].sort().join("||"));
      }
    }
  }

  const edges: Edge[] = [];
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const isEnd = to === "[end]";
      if (isEnd && !showEnd) continue;
      const targetId = isEnd ? END_NODE_ID : to;
      const strokeWidth = 1 + prob * 6;
      const opacity = 0.3 + prob * 0.6;
      const isSelf = from === targetId;
      const isBidi = !isSelf && pairSet.has([from, targetId].sort().join("||"));
      const sign = isBidi ? (from < targetId ? 1 : -1) : 0;
      edges.push({
        id: `${from}->${to}`,
        type: isSelf ? "selfloop" : isBidi ? "biedge" : "straight",
        source: from,
        target: targetId,
        data: { sign },
        label: `${(prob * 100).toFixed(0)}%`,
        labelBgPadding: [3, 5] as [number, number],
        style: {
          stroke: `rgba(107,114,128,${opacity})`,
          strokeWidth,
        },
        animated: prob >= 0.6,
      });
    }
  }
  return edges;
}

// ── Inner (keyed to force re-layout on config change) ────────────────────────

interface InnerProps extends Props {
  showEnd: boolean;
  onToggleEnd: () => void;
}

function MarkovGraphInner({
  config,
  selectedNode,
  onNodeSelect,
  showEnd,
  onToggleEnd,
}: InnerProps) {
  const startMap = useMemo(
    () => config.start ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialNodes = useMemo(
    () => layoutNodes(config, showEnd, selectedNode ?? null, startMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialEdges = useMemo(
    () => buildEdges(config, showEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Sync selection highlight without re-keying the whole graph
  useMemo(() => {
    setNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNode },
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id === END_NODE_ID) return;
      onNodeSelect?.(node.id === selectedNode ? null : node.id);
    },
    [onNodeSelect, selectedNode],
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      proOptions={{ hideAttribution: true }}
      className="bg-background"
    >
      <Background gap={20} color="hsl(var(--border))" />
      <Controls
        showInteractive={false}
        className="!shadow-none !border !border-border !rounded-md overflow-hidden"
      />
      <Panel position="top-right" className="flex items-center gap-2">
        <button
          onClick={onToggleEnd}
          className="text-[10px] px-2.5 py-1 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          {showEnd ? "Hide [end]" : "Show [end]"}
        </button>
      </Panel>
      <Panel position="bottom-center">
        <p className="text-[10px] text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border">
          Click a node to inspect transitions · drag to rearrange
        </p>
      </Panel>
    </ReactFlow>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

export function MarkovGraph({ config, selectedNode, onNodeSelect }: Props) {
  const [showEnd, setShowEnd] = useState(false);

  if (config.events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">No events yet</p>
          <p className="text-xs text-muted-foreground">
            Add an event in the left panel to build your user flow.
          </p>
        </div>
      </div>
    );
  }

  const key =
    config.events.map((e) => e.name).join(",") + (showEnd ? "|end" : "");

  return (
    <div className="w-full h-full">
      <MarkovGraphInner
        key={key}
        config={config}
        selectedNode={selectedNode}
        onNodeSelect={onNodeSelect}
        showEnd={showEnd}
        onToggleEnd={() => setShowEnd((v) => !v)}
      />
    </div>
  );
}
