// src/features/events/MarkovGraph.tsx
import { useCallback, useMemo } from "react";
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

function layoutNodes(config: MarkovConfig): Node[] {
  const n = config.events.length + 1; // +1 for [end]
  const cols = Math.ceil(Math.sqrt(n));
  const nodes: Node[] = config.events.map((ev, i) => ({
    id: ev.name,
    type: "default",
    position: {
      x: (i % cols) * (NODE_WIDTH + 60),
      y: Math.floor(i / cols) * (NODE_HEIGHT + 60),
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
  }));

  // [end] node — sink
  nodes.push({
    id: END_NODE_ID,
    type: "default",
    position: {
      x: (n % cols) * (NODE_WIDTH + 60),
      y: Math.floor(n / cols) * (NODE_HEIGHT + 60),
    },
    data: { label: "[end]" },
    style: {
      background: "#374151",
      color: "#9ca3af",
      border: "2px dashed #6b7280",
      borderRadius: 6,
      fontSize: 12,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  });

  return nodes;
}

function buildEdges(config: MarkovConfig): Edge[] {
  const edges: Edge[] = [];
  for (const [from, row] of Object.entries(config.transitions)) {
    for (const [to, prob] of Object.entries(row)) {
      if (prob === 0) continue;
      const targetId = to === "[end]" ? END_NODE_ID : to;
      edges.push({
        id: `${from}->${to}`,
        source: from,
        target: targetId,
        label: prob.toFixed(2),
        labelStyle: { fontSize: 10, fill: "#9ca3af" },
        labelBgStyle: { fill: "transparent" },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#6b7280",
          width: 12,
          height: 12,
        },
        style: { stroke: "#4b5563", strokeWidth: 1.5 },
        animated: prob >= 0.5,
      });
    }
  }
  return edges;
}

export function MarkovGraph({ config, onNodeClick }: Props) {
  const initialNodes = useMemo(() => layoutNodes(config), [config]);
  const initialEdges = useMemo(() => buildEdges(config), [config]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== END_NODE_ID) onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  return (
    <div className="w-full h-full min-h-[320px]">
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
        <Background gap={16} color="#1f2937" />
        <Controls showInteractive={false} />
        <Panel position="top-right">
          <span className="text-[10px] text-muted-foreground">
            drag to rearrange
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
}
