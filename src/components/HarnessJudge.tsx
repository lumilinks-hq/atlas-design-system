import { Position, type Rect } from "@xyflow/react";
import { StepFlow, useNarrowLayout, type ExtraHandle, type StepBox, type StepLink, type StepTone } from "./StepFlow";

type StepId = "source" | "code" | "evidence" | "review" | "bycode" | "jev" | "record" | "decide" | "fix" | "human" | "pass";

// fix、human、pass は scripts/harness-dispatch.mjs が返す step と同じ名前にする
const titles: readonly { id: StepId; title: string; tone: StepTone }[] = [
  { id: "source", title: "Runのソースコード", tone: "plain" },
  { id: "code", title: "コードで検査", tone: "plain" },
  { id: "evidence", title: "部品と文言を抜き出す", tone: "plain" },
  { id: "review", title: "LLMが画面画像をレビュー", tone: "plain" },
  { id: "bycode", title: "コードで決める", tone: "plain" },
  { id: "jev", title: "Jevに聞く", tone: "accent" },
  { id: "record", title: "判定の記録", tone: "plain" },
  { id: "decide", title: "コードが次の工程を決定", tone: "accent" },
  { id: "fix", title: "修正", tone: "plain" },
  { id: "human", title: "人の判断", tone: "plain" },
  { id: "pass", title: "通過", tone: "plain" },
];

// 口の位置は画面幅ごとに違うので、口も矢印もレイアウトに持たせる。
// 口は相手の中心に合わせた位置（幅に対する %）に置き、矢印をまっすぐにする
type Layout = {
  boxes: Record<StepId, StepBox>;
  handles: Partial<Record<StepId, readonly ExtraHandle[]>>;
  links: readonly (StepLink & { source: StepId; target: StepId })[];
  bounds: Rect;
};

const out = (id: string, offset: number): ExtraHandle => ({ id, type: "source", position: Position.Bottom, offset });
const into = (id: string, offset: number): ExtraHandle => ({ id, type: "target", position: Position.Top, offset });

// コードとJevの判定から決定まで、と決定から 3 つの行き先は、どちらの幅でも同じ
const sharedLinks = [
  { source: "bycode", target: "record", from: "out-bottom", to: "in-bycode", label: "0 か 1" },
  { source: "jev", target: "record", from: "out-bottom", to: "in-jev", label: "違反の確率" },
  { source: "record", target: "decide", from: "out-bottom", to: "in-top" },
  { source: "decide", target: "fix", from: "out-fix", to: "in-top", label: "違反・0.8以上" },
  { source: "decide", target: "human", from: "out-human", to: "in-top", label: "中間・材料不足" },
  { source: "decide", target: "pass", from: "out-pass", to: "in-top", label: "0.2以下" },
] as const;

// 広い画面: 上から、ソース、3 つの入口、コードとJevの判定、記録、決定、行き先の順に並べる。
// ソースと決定は幅 880 で、左右の列は中心を 12.5% と 87.5% に置く
const wideLayout: Layout = {
  boxes: {
    source: { x: 10, y: 0, width: 880, height: 44 },
    code: { x: 10, y: 96, width: 220, height: 56 },
    evidence: { x: 280, y: 96, width: 340, height: 56 },
    review: { x: 670, y: 96, width: 220, height: 56 },
    bycode: { x: 290, y: 220, width: 150, height: 52 },
    jev: { x: 460, y: 220, width: 150, height: 52 },
    record: { x: 350, y: 324, width: 200, height: 44 },
    decide: { x: 10, y: 424, width: 880, height: 56 },
    fix: { x: 20, y: 560, width: 200, height: 48 },
    human: { x: 350, y: 560, width: 200, height: 48 },
    pass: { x: 680, y: 560, width: 200, height: 48 },
  },
  handles: {
    source: [out("out-code", 12.5), out("out-evidence", 50), out("out-review", 87.5)],
    evidence: [out("out-bycode", 25), out("out-jev", 75)],
    record: [into("in-bycode", 7.5), into("in-jev", 92.5)],
    decide: [
      into("in-code", 12.5),
      into("in-review", 87.5),
      out("out-fix", 12.5),
      out("out-human", 50),
      out("out-pass", 87.5),
    ],
  },
  links: [
    { source: "source", target: "code", from: "out-code", to: "in-top" },
    { source: "source", target: "evidence", from: "out-evidence", to: "in-top" },
    { source: "source", target: "review", from: "out-review", to: "in-top", label: "画面を撮影" },
    { source: "evidence", target: "bycode", from: "out-bycode", to: "in-top", label: "コードで決まる" },
    { source: "evidence", target: "jev", from: "out-jev", to: "in-top", label: "意味の判定が要る" },
    { source: "code", target: "decide", from: "out-bottom", to: "in-code" },
    { source: "review", target: "decide", from: "out-bottom", to: "in-review" },
    ...sharedLinks,
  ],
  bounds: { x: 0, y: 0, width: 900, height: 612 },
};

// 狭い画面: 縦に並べる。コードの検査と画像レビューから決定への矢印は、図の左右の外側を通る
const narrowLayout: Layout = {
  boxes: {
    source: { x: 0, y: 0, width: 340, height: 44 },
    code: { x: 0, y: 100, width: 160, height: 56 },
    review: { x: 180, y: 100, width: 160, height: 56 },
    evidence: { x: 20, y: 196, width: 300, height: 44 },
    bycode: { x: 25, y: 300, width: 140, height: 56 },
    jev: { x: 175, y: 300, width: 140, height: 56 },
    record: { x: 70, y: 400, width: 200, height: 44 },
    decide: { x: 0, y: 500, width: 340, height: 56 },
    fix: { x: 0, y: 636, width: 102, height: 56 },
    human: { x: 119, y: 636, width: 102, height: 56 },
    pass: { x: 238, y: 636, width: 102, height: 56 },
  },
  handles: {
    source: [out("out-code", 23.5), out("out-evidence", 50), out("out-review", 76.5)],
    evidence: [out("out-bycode", 25), out("out-jev", 75)],
    record: [into("in-bycode", 12.5), into("in-jev", 87.5)],
    decide: [out("out-fix", 15), out("out-human", 50), out("out-pass", 85)],
  },
  links: [
    { source: "source", target: "code", from: "out-code", to: "in-top" },
    { source: "source", target: "evidence", from: "out-evidence", to: "in-top" },
    { source: "source", target: "review", from: "out-review", to: "in-top", label: "画面を撮影" },
    { source: "evidence", target: "bycode", from: "out-bycode", to: "in-top", label: "コードで決まる" },
    { source: "evidence", target: "jev", from: "out-jev", to: "in-top", label: "意味の判定が要る" },
    { source: "code", target: "decide", from: "out-left", to: "in-left" },
    { source: "review", target: "decide", from: "out-right", to: "in-right" },
    ...sharedLinks,
  ],
  bounds: { x: -40, y: 0, width: 420, height: 696 },
};

export function HarnessJudge() {
  const narrow = useNarrowLayout();
  const layout = narrow ? narrowLayout : wideLayout;
  const steps = titles.map((step) => ({ ...step, handles: layout.handles[step.id] ?? [] }));

  return (
    <figure className={`harness-judge ${narrow ? "harness-judge-narrow" : "harness-judge-wide"}`} aria-label="Jevで判定して次の工程を決める図">
      <div className="harness-judge-canvas">
        <StepFlow
          id="harness-judge"
          key={narrow ? "narrow" : "wide"}
          steps={steps}
          boxes={layout.boxes}
          links={layout.links}
          bounds={layout.bounds}
        />
      </div>
    </figure>
  );
}
