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
import { Fragment, useEffect, useState } from "react";

export type LoopStep = {
  id: string;
  number: string;
  title: string;
  failed?: number;
};

type StepNodeData = { step: LoopStep };
type StepNode = Node<StepNodeData, "step">;

type Point = { x: number; y: number };
type EdgeEnds = { from: Position; to: Position };
type Layout = {
  nodeWidth: number;
  positions: [Point, Point, Point, Point, Point, Point];
  edges: [EdgeEnds, EdgeEnds, EdgeEnds, EdgeEnds, EdgeEnds];
  bounds: Rect;
};

const nodeHeight = 128;

// 広い画面: 上段に 01 → 02 → 03、下段に 04 → 05 → 06 を並べ、03 → 04 は段の間を通す
const wideLayout: Layout = {
  nodeWidth: 220,
  positions: [
    { x: 0, y: 0 },
    { x: 250, y: 0 },
    { x: 500, y: 0 },
    { x: 0, y: 208 },
    { x: 250, y: 208 },
    { x: 500, y: 208 },
  ],
  edges: [
    { from: Position.Right, to: Position.Left },
    { from: Position.Right, to: Position.Left },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Right, to: Position.Left },
    { from: Position.Right, to: Position.Left },
  ],
  bounds: { x: 0, y: 0, width: 720, height: 336 },
};

// 狭い画面: 縦一列に 01 から 06 まで並べる
const narrowLayout: Layout = {
  nodeWidth: 240,
  positions: [
    { x: 0, y: 0 },
    { x: 0, y: 160 },
    { x: 0, y: 320 },
    { x: 0, y: 480 },
    { x: 0, y: 640 },
    { x: 0, y: 800 },
  ],
  edges: [
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
    { from: Position.Bottom, to: Position.Top },
  ],
  bounds: { x: 0, y: 0, width: 240, height: 928 },
};

const narrowQuery = "(max-width: 800px)";
const fitOptions = { padding: 0.04 };
const handlePositions = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function StepNodeView({ data }: NodeProps<StepNode>) {
  const { step } = data;
  return (
    <>
      {handlePositions.map((position) => (
        <Fragment key={position}>
          <Handle type="target" position={position} id={`in-${position}`} isConnectable={false} className="harness-flow-handle" />
          <Handle type="source" position={position} id={`out-${position}`} isConnectable={false} className="harness-flow-handle" />
        </Fragment>
      ))}
      <div className="harness-loop-step">
        <span className="harness-loop-step-head">
          <span className="harness-loop-step-number">{step.number}</span>
          {step.failed !== undefined && (
            <span className={step.failed === 0 ? "harness-loop-badge result-pass" : "harness-loop-badge result-fail"}>
              違反 {step.failed}件
            </span>
          )}
        </span>
        <span className="harness-loop-step-title">{step.title}</span>
      </div>
    </>
  );
}

// React Flow は nodeTypes が毎回新しいオブジェクトだと警告するので、モジュール定数にする
const nodeTypes = { step: StepNodeView };

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

type HarnessLoopProps = {
  steps: readonly LoopStep[];
};

export function HarnessLoop({ steps }: HarnessLoopProps) {
  const narrow = useNarrowLayout();
  const layout = narrow ? narrowLayout : wideLayout;
  const staticNode = { draggable: false, selectable: false, focusable: false, connectable: false, deletable: false };

  const nodes: StepNode[] = steps.map((step, index) => ({
    id: step.id,
    type: "step",
    position: layout.positions[index] ?? layout.positions[0],
    width: layout.nodeWidth,
    height: nodeHeight,
    data: { step },
    ...staticNode,
  }));

  const edges: Edge[] = steps.slice(0, -1).map((step, index) => {
    const next = steps[index + 1] ?? step;
    const { from, to } = layout.edges[index] ?? layout.edges[0];
    return {
      id: `${step.id}-${next.id}`,
      source: step.id,
      target: next.id,
      sourceHandle: `out-${from}`,
      targetHandle: `in-${to}`,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
      pathOptions: { borderRadius: 12, offset: 20 },
      selectable: false,
      focusable: false,
      deletable: false,
    };
  });

  return (
    <figure className={`harness-loop ${narrow ? "harness-loop-narrow" : "harness-loop-wide"}`} aria-label="顧客管理での1周の図">
      <div className="harness-loop-canvas">
        <ReactFlow
          id="harness-loop"
          key={narrow ? "narrow" : "wide"}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            void instance.fitBounds(layout.bounds, fitOptions);
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
