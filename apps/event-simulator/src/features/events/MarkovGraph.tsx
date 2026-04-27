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
  MarkerType,
  Panel,
  BaseEdge,
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
        "flex items-center gap-2 rounded-md px-3 text-xs font-semibold transition-all shadow-sm",
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
          : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className="size-2 rounded-full bg-white/30 shrink-0" aria-hidden />
      <span className="truncate">{d.label}</span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { eventNode: EventNode };

// ── Self-loop edge ───────────────────────────────────────────────────────────

function SelfLoopEdge({
  sourceX,
  sourceY,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
}: EdgeProps) {
  // sourceX/Y is the right-side handle; derive node top-center
  const cx = sourceX - NODE_WIDTH / 2;
  const cy = sourceY - NODE_HEIGHT / 2; // top edge
  const r = 32;
  const d = `M ${cx - r * 0.6} ${cy} C ${cx - r} ${cy - r * 2.5} ${cx + r} ${cy - r * 2.5} ${cx + r * 0.6} ${cy}`;
  const lx = cx;
  const ly = cy - r * 2.6;
  return (
    <>
      <BaseEdge path={d} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
              fontSize: 10,
              fontWeight: 500,
              color: "#6b7280",
              background: "hsl(var(--background) / 0.85)",
              padding: `${(labelBgPadding as number[])?.[1] ?? 3}px ${(labelBgPadding as number[])?.[0] ?? 5}px`,
              borderRadius: 3,
              pointerEvents: "none",
              ...(labelStyle as React.CSSProperties),
              ...(labelBgStyle as React.CSSProperties),
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
  markerEnd,
  label,
  data,
}: EdgeProps) {
  // Perpendicular offset direction — sign comes from edge data
  const sign = (data as { sign?: number })?.sign ?? 1;
  const OFFSET = 48;

  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Unit perpendicular
  const px = (-dy / len) * OFFSET * sign;
  const py = (dx / len) * OFFSET * sign;

  const cx = mx + px;
  const cy = my + py;
  const d = `M ${sourceX} ${sourceY} Q ${cx} ${cy} ${targetX} ${targetY}`;
  const lx = cx;
  const ly = cy;

  return (
    <>
      <BaseEdge path={d} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${lx}px,${ly}px)`,
              fontSize: 10,
              fontWeight: 500,
              color: "#6b7280",
              background: "hsl(var(--background) / 0.85)",
              padding: "2px 5px",
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

const edgeTypes = { selfloop: SelfLoopEdge, biedge: BiEdge };

// ── Layout (dagre — left-to-right workflow) ───────────────────────────────────

function layoutNodes(
  config: MarkovConfig,
  showEnd: boolean,
  selected: string | null,
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "LR",
    nodesep: 48,
    ranksep: 96,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  config.events.forEach((ev) =>
    g.setNode(ev.name, { width: NODE_WIDTH, height: NODE_HEIGHT }),
  );
  if (showEnd)
    g.setNode(END_NODE_ID, { width: NODE_WIDTH, height: NODE_HEIGHT });

  // Feed edges so dagre knows the flow direction
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const target = to === "[end]" ? END_NODE_ID : to;
      if (!showEnd && target === END_NODE_ID) continue;
      if (g.hasNode(from) && g.hasNode(target)) g.setEdge(from, target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = config.events.map((ev) => {
    const { x, y } = g.node(ev.name);
    return {
      id: ev.name,
      type: "eventNode",
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: {
        label: ev.name,
        color: ev.color ?? "#6366f1",
        selected: ev.name === selected,
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
      const strokeWidth = 1 + prob * 7;
      const opacity = 0.25 + prob * 0.75;
      const arrowSize = 8 + prob * 8;
      const isSelf = from === targetId;
      const isBidi = !isSelf && pairSet.has([from, targetId].sort().join("||"));
      // sign: +1 or -1 so both arcs go on opposite sides of the straight line
      const sign = isBidi ? (from < targetId ? 1 : -1) : 0;
      edges.push({
        id: `${from}->${to}`,
        type: isSelf ? "selfloop" : isBidi ? "biedge" : "default",
        source: from,
        target: targetId,
        data: { sign },
        label: `${(prob * 100).toFixed(0)}%`,
        labelStyle: { fontSize: 10, fill: "#6b7280", fontWeight: 500 },
        labelBgPadding: [3, 5] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: `rgba(107,114,128,${opacity})`,
          width: arrowSize,
          height: arrowSize,
        },
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
  const initialNodes = useMemo(
    () => layoutNodes(config, showEnd, selectedNode ?? null),
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
