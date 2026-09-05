import "@xyflow/react/dist/style.css";
import {
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type Rect,
} from "@xyflow/react";
import { RefreshCw, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

export type CycleLayer = {
  id: string;
  number: string;
  name: string;
  lead: string;
  arrow: string;
  icon: LucideIcon;
};

type LayerNodeData = { layer: CycleLayer; selected: boolean };
type LayerNode = Node<LayerNodeData, "layer">;
type CenterNode = Node<{ label: string }, "center">;
type CycleNode = LayerNode | CenterNode;

type Point = { x: number; y: number };
type EdgeEnds = { from: Position; to: Position };
type Layout = {
  nodeWidth: number;
  positions: [Point, Point, Point, Point];
  center: Point | null;
  edges: [EdgeEnds, EdgeEnds, EdgeEnds, EdgeEnds];
  bounds: Rect;
};

const nodeHeight = 132;
const centerSize = { width: 120, height: 80 };

// 広い画面: 01 → 02 → 03 → 04 を時計回りに並べ、中央にループの印を置く
const wideLayout: Layout = {
  nodeWidth: 260,
  positions: [
    { x: 0, y: 0 },
    { x: 460, y: 0 },
    { x: 460, y: 252 },
    { x: 0, y: 252 },
  ],
  center: { x: 300, y: 152 },
  edges: [
    { from: Position.Right, to: Position.Left },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Left, to: Position.Right },
    { from: Position.Top, to: Position.Bottom },
  ],
  bounds: { x: 0, y: 0, width: 720, height: 384 },
};

// 狭い画面: 縦一列に並べ、04 → 01 は左側を通って戻る
const narrowLayout: Layout = {
  nodeWidth: 240,
  positions: [
    { x: 0, y: 0 },
    { x: 0, y: 224 },
    { x: 0, y: 448 },
    { x: 0, y: 672 },
  ],
  center: null,
  edges: [
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Left, to: Position.Left },
  ],
  bounds: { x: -112, y: 0, width: 352, height: 804 },
};

const narrowQuery = "(max-width: 800px)";
const fitOptions = { padding: 0.04 };
const handlePositions = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function LayerNodeView({ data }: NodeProps<LayerNode>) {
  const { layer, selected } = data;
  const Icon = layer.icon;
  return (
    <>
      {handlePositions.map((position) => (
        <Fragment key={position}>
          <Handle type="target" position={position} id={`in-${position}`} isConnectable={false} className="harness-flow-handle" />
          <Handle type="source" position={position} id={`out-${position}`} isConnectable={false} className="harness-flow-handle" />
        </Fragment>
      ))}
      <button
        type="button"
        className="harness-flow-layer"
        aria-pressed={selected}
        aria-labelledby={`flow-${layer.id}-number flow-${layer.id}-name`}
        aria-describedby={`flow-${layer.id}-lead`}
      >
        <span className="harness-flow-layer-head">
          <span id={`flow-${layer.id}-number`} className="harness-layer-number">
            {layer.number}
          </span>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span id={`flow-${layer.id}-name`} className="harness-flow-layer-name">
          {layer.name}
        </span>
        <span id={`flow-${layer.id}-lead`} className="harness-flow-layer-lead">
          {layer.lead}
        </span>
      </button>
    </>
  );
}

function CenterNodeView({ data }: NodeProps<CenterNode>) {
  return (
    <div className="harness-flow-center" aria-hidden="true">
      <RefreshCw size={18} aria-hidden="true" />
      <span>{data.label}</span>
    </div>
  );
}

// React Flow は nodeTypes が毎回新しいオブジェクトだと警告するので、モジュール定数にする
const nodeTypes = { layer: LayerNodeView, center: CenterNodeView };

function useNarrowLayout() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(narrowQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(narrowQuery);
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

// 画面幅が変わったら図全体を収め直す（初回は onInit で収める）
function FitOnResize({ bounds }: { bounds: Rect }) {
  const { fitBounds } = useReactFlow();
  useEffect(() => {
    const fit = () => {
      void fitBounds(bounds, fitOptions);
    };
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [bounds, fitBounds]);
  return null;
}

type HarnessCycleProps = {
  layers: readonly CycleLayer[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function HarnessCycle({ layers, selectedId, onSelect }: HarnessCycleProps) {
  const narrow = useNarrowLayout();
  const layout = narrow ? narrowLayout : wideLayout;
  const staticNode = { draggable: false, selectable: false, focusable: false, connectable: false, deletable: false };

  const nodes: CycleNode[] = layers.map((layer, index) => ({
    id: layer.id,
    type: "layer",
    position: layout.positions[index] ?? layout.positions[0],
    width: layout.nodeWidth,
    height: nodeHeight,
    data: { layer, selected: layer.id === selectedId },
    ...staticNode,
  }));
  if (layout.center) {
    nodes.push({
      id: "center",
      type: "center",
      position: layout.center,
      ...centerSize,
      data: { label: "1周 = 1 Run" },
      ...staticNode,
    });
  }

  const edges: Edge[] = layers.map((layer, index) => {
    const next = layers[(index + 1) % layers.length] ?? layer;
    const { from, to } = layout.edges[index] ?? layout.edges[0];
    return {
      id: `${layer.id}-${next.id}`,
      source: layer.id,
      target: next.id,
      sourceHandle: `out-${from}`,
      targetHandle: `in-${to}`,
      type: "smoothstep",
      label: layer.arrow,
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      pathOptions: { borderRadius: 12, offset: 40 },
      selectable: false,
      focusable: false,
      deletable: false,
    };
  });

  return (
    <figure className={`harness-flow ${narrow ? "harness-flow-narrow" : "harness-flow-wide"}`} aria-label="デザインハーネスのループ図">
      <div className="harness-flow-canvas">
        <ReactFlow
          key={narrow ? "narrow" : "wide"}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            void instance.fitBounds(layout.bounds, fitOptions);
          }}
          // 選択も移動も無効なノードには React Flow が pointer-events: none を付けるので、クリックはここで受ける
          onNodeClick={(_event, node) => {
            if (node.type === "layer") onSelect(node.id);
          }}
          defaultMarkerColor="var(--dh-accent)"
          minZoom={0.4}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          disableKeyboardA11y
          autoPanOnNodeFocus={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          deleteKeyCode={null}
          zoomActivationKeyCode={null}
          panActivationKeyCode={null}
        >
          <FitOnResize bounds={layout.bounds} />
        </ReactFlow>
      </div>
    </figure>
  );
}
