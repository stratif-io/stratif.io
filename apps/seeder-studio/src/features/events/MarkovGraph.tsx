// src/features/events/MarkovGraph.tsx
import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { MarkovConfig } from "@/types/simulation";

interface Props {
  config: MarkovConfig;
  onNodeClick?: (eventName: string) => void;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 36;
const END_NODE_ID = "__end__";

// Arrange event nodes in a circle; [end] at bottom-centre when shown.
function layoutNodes(config: MarkovConfig, showEnd: boolean): Node[] {
  const count = config.events.length;
  const radius = Math.max(160, count * 48);
  const cx = radius;
  const cy = radius;

  const nodes: Node[] = config.events.map((ev, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      id: ev.name,
      type: "default",
      position: {
        x: cx + radius * Math.cos(angle) - NODE_WIDTH / 2,
        y: cy + radius * Math.sin(angle) - NODE_HEIGHT / 2,
      },
      data: { label: ev.name },
      style: {
        background: ev.color ?? "#6366f1",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    };
  });

  if (showEnd) {
    nodes.push({
      id: END_NODE_ID,
      type: "default",
      position: { x: cx - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 },
      data: { label: "[end]" },
      style: {
        background: "#f3f4f6",
        color: "#9ca3af",
        border: "2px dashed #d1d5db",
        borderRadius: 6,
        fontSize: 12,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });
  }

  return nodes;
}

function buildEdges(config: MarkovConfig, showEnd: boolean): Edge[] {
  const edges: Edge[] = [];
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const isEnd = to === "[end]";
      if (isEnd && !showEnd) continue;
      const targetId = isEnd ? END_NODE_ID : to;
      edges.push({
        id: `${from}->${to}`,
        source: from,
        target: targetId,
        label: prob.toFixed(2),
        labelStyle: { fontSize: 10, fill: "#6b7280" },
        labelBgStyle: { fill: "transparent" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#9ca3af",
          width: 12,
          height: 12,
        },
        style: { stroke: "#d1d5db", strokeWidth: 1.5 },
        animated: prob >= 0.5,
      });
    }
  }
  return edges;
}

interface InnerProps extends Props {
  showEnd: boolean;
  onToggleEnd: () => void;
}

function MarkovGraphInner({
  config,
  onNodeClick,
  showEnd,
  onToggleEnd,
}: InnerProps) {
  const initialNodes = useMemo(
    () => layoutNodes(config, showEnd),
    [config, showEnd],
  );
  const initialEdges = useMemo(
    () => buildEdges(config, showEnd),
    [config, showEnd],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== END_NODE_ID) onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} color="#e5e7eb" />
      <Controls showInteractive={false} />
      <Panel position="top-right" className="flex items-center gap-2">
        <button
          onClick={onToggleEnd}
          className="text-[10px] px-2 py-0.5 rounded border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          {showEnd ? "hide [end]" : "show [end]"}
        </button>
        <span className="text-[10px] text-muted-foreground">
          drag to rearrange
        </span>
      </Panel>
    </ReactFlow>
  );
}

export function MarkovGraph({ config, onNodeClick }: Props) {
  const [showEnd, setShowEnd] = useState(false);

  if (config.events.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="text-sm font-medium">No events yet</p>
        <p className="text-xs">
          Add an event in the Events tab to build your user flow.
        </p>
      </div>
    );
  }

  const key =
    config.events.map((e) => e.name).join(",") + (showEnd ? "|end" : "");
  return (
    <div className="w-full h-full min-h-[320px]">
      <MarkovGraphInner
        key={key}
        config={config}
        onNodeClick={onNodeClick}
        showEnd={showEnd}
        onToggleEnd={() => setShowEnd((v) => !v)}
      />
    </div>
  );
}
