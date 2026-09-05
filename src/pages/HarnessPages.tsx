import { Button, Table } from "@heroui/react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  ExternalLink,
  FileText,
  Layers,
  Minus,
  RefreshCw,
  ScanSearch,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HarnessCycle } from "../components/HarnessCycle";
import { HarnessLoop, type LoopStep } from "../components/HarnessLoop";
import { designData } from "../data/design";
import { repositoryBranch, repositoryUrl } from "../data/repository";
import {
  baselineEvaluation,
  comparison,
  harnessEvaluation,
  runEnvironment,
  sameModelRuns,
  type RunCheck,
  type RunEvaluation,
} from "../data/runs";
import { PageHeader, ruleMethodLabels } from "./DocsPages";

const runId = comparison.pairId;
const cliLabel = runEnvironment.cliVersion;
const screenshotBase = `/experiments/account-management/runs/${runId}`;
const resultsPath = "/examples/account-management/results";
const rules = designData.rules;
const methodCounts = rules.reduce<Record<string, number>>((counts, rule) => {
  counts[rule.method] = (counts[rule.method] ?? 0) + 1;
  return counts;
}, {});
const lintCount = methodCounts["lint"] ?? 0;
const automaticCount = methodCounts["automatic"] ?? 0;
const aiReviewCount = methodCounts["ai-review"] ?? 0;
const humanCount = methodCounts["human"] ?? 0;
// 「Lint 12、自動検証 11」のような内訳を design/rules.json から組み立てる。0件の手段は出さない
const ruleMethodOrder = ["lint", "automatic", "ai-review", "human"];
const rulesNote = `ルール${rules.length}件（${ruleMethodOrder
  .filter((method) => (methodCounts[method] ?? 0) > 0)
  .map((method) => `${ruleMethodLabels[method] ?? method} ${methodCounts[method]}`)
  .join("、")}）`;

const statusLabels: Record<string, string> = { passed: "合格", failed: "違反", review: "要確認" };
const verdictLabels: Record<string, string> = { pass: "問題なし", concern: "懸念あり" };
const checkLabels: Record<string, string> = {
  typecheck: "型検査",
  test: "テスト",
  build: "ビルド",
  "design-rules": "設計ルール",
};

function ruleStatus(evaluation: RunEvaluation, ruleId: string) {
  return evaluation.rules.find((rule) => rule.id === ruleId)?.status ?? "review";
}

function reviewFinding(evaluation: RunEvaluation, ruleId: string) {
  return evaluation.review.findings.find((finding) => finding.ruleId === ruleId);
}

function StatusIcon({ status }: { status: string }) {
  if (status === "passed") return <Check size={14} aria-hidden="true" />;
  if (status === "failed") return <X size={14} aria-hidden="true" />;
  if (status === "skipped") return <Minus size={14} aria-hidden="true" />;
  return <CircleAlert size={14} aria-hidden="true" />;
}

// baseline の workspace は Atlas 層(eslint-plugin-atlas)を受け取らないため、
// lint が通っても基本ルール(js/tseslint recommended)を通っただけ。合格と見せない
function describeCheck(check: RunCheck, condition: string) {
  if (check.name !== "lint") return { label: checkLabels[check.name] ?? check.name, status: check.status };
  if (condition === "baseline") return { label: "Lint（Atlas ルール非適用、基本ルールのみ）", status: "skipped" };
  return { label: "Lint（Atlas ルール含む）", status: check.status };
}

const checkClassNames: Record<string, string> = { passed: "check-pass", skipped: "check-skip" };

export function ChecksList({ checks, label, condition }: { checks: RunCheck[]; label: string; condition: string }) {
  return (
    <ul className="check-list" aria-label={label}>
      {checks.map((check) => {
        const shown = describeCheck(check, condition);
        return (
          <li key={check.name} className={checkClassNames[shown.status] ?? "check-fail"}>
            <StatusIcon status={shown.status} />
            {shown.label}
          </li>
        );
      })}
    </ul>
  );
}

const layers = [
  {
    id: "constrain",
    number: "01",
    name: "制約する層",
    icon: Layers,
    lead: "AIが選べる範囲を先に決める",
    artifacts: [
      { path: "design/tokens.json", note: "色、文字、余白、角丸、影の値" },
      { path: "design/components/*.json", note: "採用部品とvariant・sizeの契約" },
      { path: "design/rules.json", note: rulesNote },
    ],
    links: [
      { to: "/foundations", label: "デザイントークン" },
      { to: "/components", label: "コンポーネント" },
    ],
    arrow: "設計データを束ねる",
  },
  {
    id: "context",
    number: "02",
    name: "コンテキストを渡す層",
    icon: FileText,
    lead: "判断の背景を、同じ形でAIに読ませる",
    artifacts: [
      { path: "DESIGN.md", note: "参照の入口" },
      { path: "design/patterns/*.json", note: "ページレイアウト、余白、まとまり、狭い画面の組み替え" },
      { path: "design/examples/account-management.json", note: "顧客管理をパターンへ写したサンプル" },
      { path: "skills/atlas-design-system/", note: "AIエージェントが読むSkill。MCPは scripts/mcp/" },
    ],
    links: [
      { to: "/patterns/page-layout", label: "ページレイアウト" },
      { to: "/examples/account-management", label: "例：顧客管理" },
      { to: "/getting-started", label: "導入方法" },
    ],
    arrow: "AIが生成する",
  },
  {
    id: "verify",
    number: "03",
    name: "検証する層",
    icon: ScanSearch,
    lead: "機械、AI、人の順に、確かめる役割を分ける",
    artifacts: [
      { path: "scripts/evaluate-experiment.mjs", note: "design/rules.json による自動検証" },
      { path: "scripts/review-experiment.mjs", note: "画面画像に対するAIレビュー" },
      { path: "experiments/*/runs/*/design-evaluation.json", note: "検証結果の保存先" },
    ],
    links: [{ to: "/rules", label: "検証ルール" }],
    arrow: "違反と指摘を記録する",
  },
  {
    id: "feedback",
    number: "04",
    name: "フィードバックする層",
    icon: RefreshCw,
    lead: "検査結果を次の生成と、設計データへ戻す",
    artifacts: [
      { path: "VALIDATION.md", note: "Runごとの検査結果。修正の入力になる", inRepository: false },
      { path: "scripts/refine-experiment.mjs", note: "pnpm experiment:refine で修正版を保存" },
      { path: "design/rules.json", note: "指摘から増やすルール（01へ戻る）" },
    ],
    links: [{ to: resultsPath, label: "生成結果の比較" }],
    arrow: "ルールへ書き戻す",
  },
] as const;

// inRepository が false のものは Run ごとの生成物で、リポジトリには入っていない
type LayerArtifact = { path: string; note: string; inRepository?: boolean };

export const harnessArtifacts: readonly LayerArtifact[] = layers.flatMap(
  (layer): readonly LayerArtifact[] => layer.artifacts,
);

// 表のパスを GitHub の原本へ結ぶ。* を含むものと末尾が / のものはディレクトリ、それ以外はファイルを指す
export function artifactSourceHref(path: string) {
  const segments = path.replace(/\/$/, "").split("/");
  const globIndex = segments.findIndex((segment) => segment.includes("*"));
  if (globIndex >= 0) return `${repositoryUrl}/tree/${repositoryBranch}/${segments.slice(0, globIndex).join("/")}`;
  if (path.endsWith("/")) return `${repositoryUrl}/tree/${repositoryBranch}/${segments.join("/")}`;
  return `${repositoryUrl}/blob/${repositoryBranch}/${segments.join("/")}`;
}

function ArtifactPath({ artifact }: { artifact: LayerArtifact }) {
  if (artifact.inRepository === false) return <code>{artifact.path}</code>;
  return (
    <a className="artifact-source" href={artifactSourceHref(artifact.path)} target="_blank" rel="noreferrer">
      <code>{artifact.path}</code>
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}

const artifactColumns = [
  { id: "path", label: "ファイル", isRowHeader: true, width: "40%", minWidth: 144, align: "start" },
  { id: "note", label: "役割", isRowHeader: false, width: "60%", minWidth: 144, align: "start" },
] as const;

export function HarnessPage() {
  const [selectedLayerId, setSelectedLayerId] = useState<string>(layers[0].id);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? layers[0];
  const selectedArtifacts: readonly LayerArtifact[] = selectedLayer.artifacts;
  const loopSteps: LoopStep[] = [
    { id: "issue", number: "01", title: "Issueを渡す" },
    { id: "context", number: "02", title: "制約とコンテキストを渡す" },
    { id: "generate", number: "03", title: "AIが生成する" },
    { id: "verify", number: "04", title: "検査する", failed: harnessEvaluation.summary.failed },
    { id: "feedback", number: "05", title: "検査結果をVALIDATION.mdとして返す" },
    { id: "reverify", number: "06", title: "修正版を再検査する" },
  ];

  return (
    <article className="doc-page harness-page">
      <PageHeader
        title="デザインハーネス"
        description="AIに渡す制約とコンテキスト、生成後の検証、結果の書き戻しを1つのループにします。"
      />

      <section aria-labelledby="cycle-title" className="harness-section">
        <h2 id="cycle-title">4つの層</h2>
        <HarnessCycle layers={layers} selectedId={selectedLayer.id} onSelect={setSelectedLayerId} />
        <section className="harness-detail" aria-labelledby="harness-detail-title">
          <h3 id="harness-detail-title">{selectedLayer.name}</h3>
          <Table.Root className="harness-artifacts" aria-label={`${selectedLayer.name}のファイル`} variant="primary">
            <Table.ScrollContainer>
              <Table.Content aria-label={`${selectedLayer.name}のファイル`}>
                <Table.Header columns={artifactColumns}>
                  {(column) => (
                    <Table.Column
                      id={column.id}
                      isRowHeader={column.isRowHeader}
                      width={column.width}
                      minWidth={column.minWidth}
                      data-align={column.align}
                    >
                      {column.label}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body items={selectedArtifacts}>
                  {(artifact) => (
                    <Table.Row id={artifact.path} columns={artifactColumns}>
                      {(column) => (
                        <Table.Cell data-align={column.align}>
                          {column.id === "path" ? <ArtifactPath artifact={artifact} /> : artifact.note}
                        </Table.Cell>
                      )}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table.Root>
          <p className="harness-layer-links">
            {selectedLayer.links.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </p>
        </section>
      </section>

      <section aria-labelledby="method-title" className="harness-section">
        <h2 id="method-title">妥当性を、誰がどう担保するか</h2>
        <div className="method-text">
          <p>検査の役割を、機械、AI、人の順に分けます。</p>
          <p>
            機械は、<code>design/rules.json</code> のルールで生成物を検査します。{rules.length}件のルールのうち{lintCount}件はESLintで、
            {automaticCount}件は評価スクリプトで自動検証します。承認済みの部品を使っているか、色コードを直接書いていないか、必要な画面状態があるかを、毎回同じ基準で判定します。
          </p>
          <p>
            AIは画面の画像を見て、色だけで状態を伝えていないか、エラーから回復できるかなど、値の照合では決められない
            {aiReviewCount}件をレビューします。
          </p>
          <p>
            自動検証とAIレビューが「要確認」にした項目は、合否を機械で決めず、人が画面を見て判断します。判定そのものを人に任せているルールは
            {humanCount}件で、人の仕事は結果の採否と、繰り返し出る指摘をルールに書き戻すことです。
          </p>
        </div>
      </section>

      <section aria-labelledby="loop-title" className="harness-section">
        <h2 id="loop-title">デモ画面の生成サイクル</h2>
        <p>
          検査の違反数は、下のリンク先の比較ページと同じ run（lint-01、Claude Opus 5）の初回検査の値です。
        </p>
        <HarnessLoop steps={loopSteps} />
        <div className="harness-cta-row">
          <Link className="harness-cta" to={resultsPath}>
            生成結果の比較を見る <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="harness-cta" to="/technical-specifications#design-contract-stack-title">
            技術仕様（設計契約と検証）を見る <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </article>
  );
}

type Screen = { id: string; label: string; suffix: string; kind: "desktop" | "mobile" };

const defaultScreen: Screen = { id: "list", label: "一覧", suffix: "", kind: "desktop" };
const screens: Screen[] = [
  defaultScreen,
  { id: "detail", label: "詳細", suffix: "-detail", kind: "desktop" },
  { id: "list-mobile", label: "一覧（モバイル）", suffix: "-mobile", kind: "mobile" },
  { id: "detail-mobile", label: "詳細（モバイル）", suffix: "-detail-mobile", kind: "mobile" },
];

const conditions = [
  {
    id: "baseline",
    folder: "baseline",
    title: "ハーネスなし",
    caption: "Issueだけを渡して生成",
    evaluation: baselineEvaluation,
    checks: comparison.checks.baseline,
    playMode: "baseline",
    playLabel: "設計指示なしの画面を操作する",
    note: null,
  },
  {
    id: "harness",
    folder: "harness",
    title: "ハーネスあり",
    caption: "設計データを渡して生成",
    evaluation: harnessEvaluation,
    checks: comparison.checks.harness,
    playMode: "atlas",
    playLabel: "Atlas適用後の画面を操作する",
    note: "ESLint 層を含む設計データを渡し、生成中に pnpm lint で自分で直した初回生成です。人もAIも、あとから修正ループは回していません。",
  },
];

export function ResultsPage() {
  const navigate = useNavigate();
  const [screenId, setScreenId] = useState(defaultScreen.id);
  const screen = screens.find((item) => item.id === screenId) ?? defaultScreen;
  const aiRules = rules.filter((rule) => rule.method === "ai-review");

  return (
    <article className="doc-page results-page">
      <PageHeader
        title="生成結果の比較"
        description="同じIssueから、ハーネスなし／ありでAIが生成した顧客管理画面です。保存済みRunの画面と検査結果だけを表示し、閲覧時にAIは動きません。"
      />

      <ul className="run-strip" aria-label="Runの情報">
        <li>
          <strong>Run {runId}</strong>
        </li>
        <li>{cliLabel}</li>
        <li>Model {runEnvironment.model}</li>
        {comparison.conditionsMatch && <li>同じIssue・同じ環境で生成</li>}
        <li>人は生成コードを直接修正していない</li>
      </ul>

      <div className="compare-toolbar">
        <span className="meta-label">表示する画面</span>
        <div className="compare-screens" role="group" aria-label="表示する画面">
          {screens.map((item) => (
            <Button
              key={item.id}
              size="sm"
              aria-pressed={item.id === screen.id}
              variant={item.id === screen.id ? "primary" : "secondary"}
              onPress={() => setScreenId(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="compare-grid">
        {conditions.map((condition) => {
          const src = `${screenshotBase}/${condition.folder}${screen.suffix}.png`;
          const alt = `${condition.title}で生成した顧客管理画面（${screen.label}）`;
          return (
            <article
              key={condition.id}
              className={`site-card compare-card compare-card-${condition.id}`}
              aria-labelledby={`compare-${condition.id}-title`}
            >
              <header className="compare-head">
                <div>
                  <p className="compare-caption">{condition.caption}</p>
                  <h2 id={`compare-${condition.id}-title`}>{condition.title}</h2>
                </div>
                <p className="compare-score">
                  <strong>{condition.evaluation.summary.passed}</strong>
                  <span>/{rules.length} ルール合格</span>
                </p>
              </header>
              <figure className={`compare-figure compare-figure-${screen.kind}`}>
                <img alt={alt} src={src} />
                <figcaption>
                  <span>{screen.label}</span>
                  <a href={src} target="_blank" rel="noreferrer">
                    原寸で開く <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
              <footer className="compare-foot">
                <ul className="compare-summary" aria-label={`${condition.title}の検査結果`}>
                  <li className="result-pass">
                    <Check size={14} aria-hidden="true" />
                    <strong>{condition.evaluation.summary.passed}</strong> 合格
                  </li>
                  <li className="result-fail">
                    <X size={14} aria-hidden="true" />
                    <strong>{condition.evaluation.summary.failed}</strong> 違反
                  </li>
                  <li className="result-review">
                    <CircleAlert size={14} aria-hidden="true" />
                    <strong>{condition.evaluation.summary.review}</strong> 要確認
                  </li>
                </ul>
                <ChecksList checks={condition.checks} label={`${condition.title}の実行検査`} condition={condition.id} />
                {condition.note && <p className="compare-note">{condition.note}</p>}
                <Button
                  variant={condition.id === "harness" ? "primary" : "secondary"}
                  onPress={() => navigate(`/play/account-management?mode=${condition.playMode}`)}
                >
                  {condition.playLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </div>

      <section aria-labelledby="rules-title" className="compare-section">
        <div className="section-heading">
          <h2 id="rules-title">ルールごとの検査結果</h2>
          <p>
            design/rules.json の{rules.length}件を、両条件の画面に同じ手順で当てた結果です。AIレビューのルールは要確認として残し、所見を人が読みます。
          </p>
        </div>
        <div className="compare-table-scroll">
          <table className="compare-table" aria-label="ルールごとの検査結果">
            <thead>
              <tr>
                <th scope="col">ルール</th>
                <th scope="col">確認方法</th>
                <th scope="col">ハーネスなし</th>
                <th scope="col">ハーネスあり</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const cells = [
                  { evaluation: baselineEvaluation, key: "baseline" },
                  { evaluation: harnessEvaluation, key: "harness" },
                ];
                return (
                  <tr key={rule.id}>
                    <th scope="row">
                      <span className="compare-rule-title">{rule.title}</span>
                      <code>{rule.id}</code>
                    </th>
                    <td>{ruleMethodLabels[rule.method] ?? rule.method}</td>
                    {cells.map((cell) => {
                      const status = ruleStatus(cell.evaluation, rule.id);
                      const finding = reviewFinding(cell.evaluation, rule.id);
                      return (
                        <td key={cell.key}>
                          <span className={`status-badge status-${status}`}>
                            <StatusIcon status={status} />
                            {statusLabels[status] ?? status}
                          </span>
                          {finding && (
                            <span className={`status-verdict status-verdict-${finding.verdict}`}>
                              AI: {verdictLabels[finding.verdict] ?? finding.verdict}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="review-title" className="compare-section">
        <div className="section-heading">
          <h2 id="review-title">AIレビューの所見</h2>
          <p>
            {runEnvironment.model} が画面画像を見て残した所見です。合否ではなく、人が判断するための材料として保存しています。
          </p>
        </div>
        <div className="review-grid">
          {aiRules.map((rule) => (
            <article key={rule.id} className="site-card review-card" aria-labelledby={`review-${rule.id}`}>
              <h3 id={`review-${rule.id}`}>{rule.title}</h3>
              <code>{rule.id}</code>
              <dl>
                {conditions.map((condition) => {
                  const finding = reviewFinding(condition.evaluation, rule.id);
                  if (!finding) return null;
                  return (
                    <div key={condition.id}>
                      <dt>
                        {condition.title}
                        <span className={`status-verdict status-verdict-${finding.verdict}`}>
                          {verdictLabels[finding.verdict] ?? finding.verdict}
                        </span>
                      </dt>
                      <dd>{finding.note}</dd>
                    </div>
                  );
                })}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="same-model-title" className="compare-section">
        <div className="section-heading">
          <h2 id="same-model-title">同じモデルでの比較</h2>
          <p>
            上の比較で見せている lint-01 の初回生成を、ESLint 層を入れる前の prelint-01 と並べます。同じモデル（{sameModelRuns[0]?.model}）で、
            ESLint 層を入れる前と後に 1 回ずつ生成した結果です。各条件 1 run なので傾向を見るための数字で、統計的な差ではありません。
            評価器は App.tsx から import で辿れるファイルをまとめて検査するので、画面を複数ファイルに分けた run も同じ基準で数えています。
          </p>
        </div>
        <div className="compare-table-scroll">
          <table className="compare-table" aria-label="同じモデルでの比較">
            <thead>
              <tr>
                <th scope="col">Run</th>
                <th scope="col">条件</th>
                <th scope="col">ESLint 層</th>
                <th scope="col">合格</th>
                <th scope="col">違反</th>
                <th scope="col">要確認</th>
              </tr>
            </thead>
            <tbody>
              {sameModelRuns.flatMap((run) =>
                (["baseline", "harness"] as const).map((condition) => (
                  <tr key={`${run.pairId}-${condition}`}>
                    <th scope="row">
                      <span className="compare-rule-title">{run.pairId}</span>
                      <code>{run.model}</code>
                    </th>
                    <td>{condition === "baseline" ? "ハーネスなし" : "ハーネスあり"}</td>
                    <td>{condition === "harness" && run.lintLayer ? "あり" : "なし"}</td>
                    <td>{run[condition].summary.passed}</td>
                    <td>{run[condition].summary.failed}</td>
                    <td>{run[condition].summary.review}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        {sameModelRuns.map((run) => (
          <p key={run.pairId} className="compare-note">
            <strong>{run.pairId}</strong>: {run.note}
          </p>
        ))}
      </section>

      <p className="compare-back">
        <Link to="/harness">
          デザインハーネスの仕組みへ戻る <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </article>
  );
}
