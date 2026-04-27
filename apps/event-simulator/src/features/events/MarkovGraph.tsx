import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
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
        <Handle type="target" position={Position.Top} className="opacity-0" />
        [end]
        <Handle
          type="source"
          position={Position.Bottom}
          className="opacity-0"
        />
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
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="size-2 rounded-full bg-white/30 shrink-0" aria-hidden />
      <span className="truncate">{d.label}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { eventNode: EventNode };

// ── Layout ───────────────────────────────────────────────────────────────────

function layoutNodes(
  config: MarkovConfig,
  showEnd: boolean,
  selected: string | null,
): Node[] {
  const count = config.events.length;
  const radius = Math.max(180, count * 52);
  const cx = radius;
  const cy = radius;

  const nodes: Node[] = config.events.map((ev, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      id: ev.name,
      type: "eventNode",
      position: {
        x: cx + radius * Math.cos(angle) - NODE_WIDTH / 2,
        y: cy + radius * Math.sin(angle) - NODE_HEIGHT / 2,
      },
      data: {
        label: ev.name,
        color: ev.color ?? "#6366f1",
        selected: ev.name === selected,
      },
    };
  });

  if (showEnd) {
    nodes.push({
      id: END_NODE_ID,
      type: "eventNode",
      position: { x: cx - NODE_WIDTH / 2, y: cy - NODE_HEIGHT / 2 },
      data: { label: "[end]", color: "", selected: false, isEnd: true },
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
      const opacity = 0.3 + prob * 0.7;
      edges.push({
        id: `${from}->${to}`,
        source: from,
        target: targetId,
        label: `${(prob * 100).toFixed(0)}%`,
        labelStyle: { fontSize: 10, fill: "#6b7280", fontWeight: 500 },
        labelBgStyle: {
          fill: "hsl(var(--background))",
          fillOpacity: 0.85,
          rx: 3,
        },
        labelBgPadding: [3, 5] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: `rgba(107,114,128,${opacity})`,
          width: 14,
          height: 14,
        },
        style: {
          stroke: `rgba(107,114,128,${opacity})`,
          strokeWidth: prob >= 0.5 ? 2 : 1.5,
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
