import { Position, type Rect } from "@xyflow/react";
import { StepFlow, useNarrowLayout, type ExtraHandle, type StepBox, type StepTone } from "./StepFlow";

type StepId = "policy" | "criteria" | "state" | "model" | "code" | "decide" | "fix" | "human" | "advance" | "current";

// fix、human、advance は scripts/harness-dispatch.mjs が返す step と同じ名前にする。
// 複数の矢印が出入りするノードは、相手の中心に合わせた位置（幅に対する %）に口を足して矢印をまっすぐにする
const steps: readonly { id: StepId; title: string; tone: StepTone; handles?: readonly ExtraHandle[] }[] = [
  { id: "policy", title: "人が定める方針・制約・権限", tone: "accent" },
  { id: "criteria", title: "判断基準", tone: "pill" },
  {
    id: "state",
    title: "状態確認",
    tone: "pill",
    handles: [
      { id: "out-model", type: "source", position: Position.Bottom, offset: 20 },
      { id: "out-code", type: "source", position: Position.Bottom, offset: 80 },
    ],
  },
  { id: "model", title: "モデルで判定", tone: "plain" },
  { id: "code", title: "コードで検査", tone: "plain" },
  {
    id: "decide",
    title: "コードが次の工程を決定",
    tone: "accent",
    handles: [
      { id: "in-model", type: "target", position: Position.Top, offset: 25 },
      { id: "in-code", type: "target", position: Position.Top, offset: 75 },
      { id: "out-fix", type: "source", position: Position.Bottom, offset: 15 },
      { id: "out-human", type: "source", position: Position.Bottom, offset: 50 },
      { id: "out-advance", type: "source", position: Position.Bottom, offset: 85 },
    ],
  },
  { id: "fix", title: "LLMが生成・修正", tone: "plain" },
  { id: "human", title: "人の判断・追加の根拠", tone: "plain" },
  { id: "advance", title: "条件を満たせば次工程へ", tone: "accent" },
  {
    id: "current",
    title: "現在の状態",
    tone: "plain",
    handles: [
      { id: "in-fix", type: "target", position: Position.Top, offset: 15 },
      { id: "in-human", type: "target", position: Position.Top, offset: 50 },
    ],
  },
];

// from を省いた矢印は、画面幅ごとに出る向きが変わる（Layout.criteriaFrom）
type Link = { source: StepId; target: StepId; from?: string; to: string; label?: string };

const links: readonly Link[] = [
  { source: "policy", target: "criteria", from: "out-bottom", to: "in-top" },
  { source: "criteria", target: "decide", to: "in-left" },
  { source: "state", target: "model", from: "out-model", to: "in-top" },
  { source: "state", target: "code", from: "out-code", to: "in-top" },
  { source: "model", target: "decide", from: "out-bottom", to: "in-model" },
  { source: "code", target: "decide", from: "out-bottom", to: "in-code" },
  { source: "decide", target: "fix", from: "out-fix", to: "in-top", label: "要修正" },
  { source: "decide", target: "human", from: "out-human", to: "in-top", label: "判断・根拠不足" },
  { source: "decide", target: "advance", from: "out-advance", to: "in-top", label: "必須条件・承認確認" },
  { source: "fix", target: "current", from: "out-bottom", to: "in-fix", label: "状態更新・再検査" },
  { source: "human", target: "current", from: "out-bottom", to: "in-human", label: "判断・根拠追加" },
  { source: "current", target: "state", from: "out-right", to: "in-right" },
];

type Layout = { boxes: Record<StepId, StepBox>; criteriaFrom: string; bounds: Rect };

// 広い画面: 左に方針と判断基準、右に状態確認から現在の状態までを上から並べる。
// 決定と現在の状態は幅 600 で、分岐の 3 つは幅 180 の中心を 15%、50%、85% に置く
const wideLayout: Layout = {
  boxes: {
    policy: { x: 0, y: 4, width: 220, height: 56 },
    criteria: { x: 30, y: 104, width: 160, height: 40 },
    state: { x: 480, y: 12, width: 160, height: 40 },
    model: { x: 275, y: 96, width: 270, height: 56 },
    code: { x: 575, y: 96, width: 270, height: 56 },
    decide: { x: 260, y: 208, width: 600, height: 56 },
    fix: { x: 260, y: 344, width: 180, height: 64 },
    human: { x: 470, y: 344, width: 180, height: 64 },
    advance: { x: 680, y: 344, width: 180, height: 64 },
    current: { x: 260, y: 504, width: 600, height: 56 },
  },
  criteriaFrom: "out-bottom",
  bounds: { x: 0, y: 0, width: 900, height: 564 },
};

// 狭い画面: 全体を縦に並べ、分岐の 3 つだけ横に並べる。判断基準から決定へは左側を通る
const narrowLayout: Layout = {
  boxes: {
    policy: { x: 40, y: 0, width: 260, height: 52 },
    criteria: { x: 100, y: 84, width: 140, height: 40 },
    state: { x: 100, y: 160, width: 140, height: 40 },
    model: { x: 5, y: 260, width: 160, height: 56 },
    code: { x: 175, y: 260, width: 160, height: 56 },
    decide: { x: 0, y: 372, width: 340, height: 56 },
    fix: { x: 0, y: 508, width: 102, height: 72 },
    human: { x: 119, y: 508, width: 102, height: 72 },
    advance: { x: 238, y: 508, width: 102, height: 72 },
    current: { x: 0, y: 676, width: 340, height: 52 },
  },
  criteriaFrom: "out-left",
  bounds: { x: -40, y: 0, width: 420, height: 732 },
};

export function HarnessNextStep() {
  const narrow = useNarrowLayout();
  const layout = narrow ? narrowLayout : wideLayout;

  return (
    <figure className={`harness-next ${narrow ? "harness-next-narrow" : "harness-next-wide"}`} aria-label="検査結果から次の工程を決める図">
      <div className="harness-next-canvas">
        <StepFlow
          id="harness-next"
          key={narrow ? "narrow" : "wide"}
          steps={steps}
          boxes={layout.boxes}
          links={links.map((link) => ({ ...link, from: link.from ?? layout.criteriaFrom }))}
          bounds={layout.bounds}
        />
      </div>
    </figure>
  );
}
