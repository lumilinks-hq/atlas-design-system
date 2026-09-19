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

// /harness の工程図で共通に使う部品。ノードは見出しだけで、動かしたり選んだりはできない

export type StepTone = "accent" | "plain" | "pill";
export type ExtraHandle = { id: string; type: "source" | "target"; position: Position; offset: number };
export type Step = { id: string; title: string; tone: StepTone; handles?: readonly ExtraHandle[] };
export type StepBox = { x: number; y: number; width: number; height: number };
// from と to は StepNodeView の口の id（out-bottom、in-top など、または ExtraHandle の id）
export type StepLink = { source: string; target: string; from: string; to: string; label?: string };

type StepNodeData = { title: string; tone: StepTone; handles: readonly ExtraHandle[] };
type StepNode = Node<StepNodeData, "step">;

const narrowQuery = "(max-width: 800px)";
const fitOptions = { padding: 0.04 };
const sides = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function StepNodeView({ data }: NodeProps<StepNode>) {
  return (
    <>
      {sides.map((position) => (
        <Fragment key={position}>
          <Handle type="target" position={position} id={`in-${position}`} isConnectable={false} className="harness-flow-handle" />
          <Handle type="source" position={position} id={`out-${position}`} isConnectable={false} className="harness-flow-handle" />
        </Fragment>
      ))}
      {data.handles.map((handle) => (
        <Handle
          key={handle.id}
          type={handle.type}
          position={handle.position}
          id={handle.id}
          isConnectable={false}
          className="harness-flow-handle"
          style={{ left: `${handle.offset}%` }}
        />
      ))}
      <div className={`harness-next-step harness-next-step-${data.tone}`}>{data.title}</div>
    </>
  );
}

// React Flow は nodeTypes が毎回新しいオブジェクトだと警告するので、モジュール定数にする
const nodeTypes = { step: StepNodeView };

export function useNarrowLayout() {
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

type StepFlowProps = {
  // 同じページに複数の図を置くので、矢印の marker が混ざらないよう図ごとに変える
  id: string;
  steps: readonly Step[];
  boxes: Readonly<Record<string, StepBox>>;
  links: readonly StepLink[];
  bounds: Rect;
};

export function StepFlow({ id, steps, boxes, links, bounds }: StepFlowProps) {
  const staticNode = { draggable: false, selectable: false, focusable: false, connectable: false, deletable: false };

  const nodes: StepNode[] = steps.map((step) => {
    const { x, y, width, height } = boxes[step.id]!;
    return {
      id: step.id,
      type: "step",
      position: { x, y },
      width,
      height,
      data: { title: step.title, tone: step.tone, handles: step.handles ?? [] },
      ...staticNode,
    };
  });

  const edges: Edge[] = links.map((link) => ({
    id: `${link.source}-${link.target}`,
    source: link.source,
    target: link.target,
    sourceHandle: link.from,
    targetHandle: link.to,
    type: "smoothstep",
    label: link.label,
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 12,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    pathOptions: { borderRadius: 12, offset: 24 },
    selectable: false,
    focusable: false,
    deletable: false,
  }));

  return (
    <ReactFlow
      id={id}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={(instance) => {
        void instance.fitBounds(bounds, fitOptions);
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
      <FitOnResize bounds={bounds} />
    </ReactFlow>
  );
}
