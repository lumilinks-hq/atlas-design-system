import { Button, ButtonGroup, Chip } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  FileText,
  Layers3,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import baselineEvaluation from "../../experiments/account-management/runs/mvp-11/baseline/design-evaluation.json";
import comparison from "../../experiments/account-management/runs/mvp-11/comparison.json";
import correctedEvaluation from "../../experiments/account-management/runs/mvp-11/harness-corrected/design-evaluation.json";
import correctedRun from "../../experiments/account-management/runs/mvp-11/harness-corrected/run.json";
import harnessEvaluation from "../../experiments/account-management/runs/mvp-11/harness/design-evaluation.json";

const scenes = [
  { id: "issue", number: "01", label: "Issue" },
  { id: "apply", number: "02", label: "設計を適用" },
  { id: "generate", number: "03", label: "生成と検査" },
  { id: "result", number: "04", label: "結果を比較" },
] as const;

function SceneHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="scene-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </header>
  );
}

function IssueScene() {
  return (
    <section className="demo-scene issue-scene" aria-labelledby="issue-title">
      <SceneHeading
        eyebrow="01 — 作りたい機能のIssue"
        title="顧客を探して、情報を更新したい"
        description="AIへ渡す設計指示書です。利用者、必要な機能、完了条件だけを明確にします。"
      />

      <article className="issue-sheet">
        <header className="issue-sheet-header">
          <div className="issue-meta"><span><FileText size={18} /> Issue #218</span><Chip color="success" size="sm" variant="soft">対応中</Chip></div>
          <h2 id="issue-title">顧客管理</h2>
          <p>営業・CS担当者が顧客一覧から会社を選び、独立した詳細画面で基本情報と対応状況を確認・更新し、取引が終了した顧客を削除できるようにする。</p>
        </header>
        <div className="issue-columns">
          <section><p className="issue-label">利用者</p><h3>営業・CS担当者</h3><p>顧客を探し、連絡先と現在の対応状況を確認する。</p></section>
          <section><p className="issue-label">主要操作</p><h3>顧客を選んで情報を編集</h3><p>会社名、担当者、メールアドレス、ステータスを更新する。取引が終了した顧客は確認の上で削除する。</p></section>
          <section><p className="issue-label">完了条件</p><ul><li><Check size={17} />一覧と詳細を別画面に分ける</li><li><Check size={17} />入力エラーと保存状態を再現できる</li><li><Check size={17} />TypeScript・Test・Buildが通る</li></ul></section>
        </div>
      </article>
    </section>
  );
}

function ApplyScene() {
  return (
    <section className="demo-scene apply-scene">
      <SceneHeading
        eyebrow="02 — Design Harnessを適用"
        title="Issueに、Atlasの設計情報を重ねる"
        description="Issueは変えません。AIが読むコンテキストに、既存の設計判断を追加します。"
      />

      <div className="apply-flow" aria-label="IssueへAtlas Design Systemを適用する流れ">
        <div className="flow-inputs">
          <article className="site-card flow-card issue-input">
            <span className="flow-icon"><FileText size={26} /></span>
            <div><p>作りたい機能</p><h2>Issue #218</h2><span>作りたい機能と完了条件</span></div>
          </article>
          <article className="site-card flow-card system-input">
            <span className="flow-icon"><Layers3 size={26} /></span>
            <div><p>デモ用デザインシステム</p><h2>Atlas Design System</h2><span>Design Harnessを用いて管理</span></div>
            <div className="contract-chips"><span>一覧（テーブル）</span><span>詳細（1カラム）</span><span>HeroUI</span><span>検証ルール</span></div>
          </article>
        </div>
        <div className="flow-connector" aria-hidden="true"><span /><ArrowRight size={30} /></div>
        <article className="site-card flow-output">
          <span className="flow-output-icon"><Bot size={34} /></span>
          <p>AIへ渡す実装情報</p>
          <h2>実装に必要な判断が揃う</h2>
          <ul><li><CheckCircle2 size={18} />どのページ構造を使うか</li><li><CheckCircle2 size={18} />どのHeroUI部品を使うか</li><li><CheckCircle2 size={18} />何を検査するか</li></ul>
        </article>
      </div>
      <p className="scene-note"><ShieldCheck size={18} />Baselineとの差は、Atlasの設計情報を渡すかどうかだけです。</p>
    </section>
  );
}

function GenerateScene() {
  const stages = [
    { icon: FileText, title: "設計を読む", detail: "Issue + Atlas", evidence: "2種類 / 1利用例" },
    { icon: Code2, title: "画面を作る", detail: "React + HeroUI", evidence: "8状態" },
    { icon: ScanSearch, title: "同じ検査をかける", detail: "型 / テスト / ビルド", evidence: `${harnessEvaluation.summary.failed}件の設計違反` },
    { icon: CheckCircle2, title: "指摘を返して直す", detail: "生成コードを再修正", evidence: "設計違反 0件" },
  ];
  return (
    <section className="demo-scene generate-scene">
      <SceneHeading
        eyebrow="03 — 生成過程"
        title="AIは設計を読み、作り、検査結果で直す"
        description="生成を一度で終わらせず、設計ルールへ適合するまで同じRunの中で補正します。"
      />

      <ol className="generation-track">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <li key={stage.title}>
              <div className="site-card generation-card">
                <span className="generation-number">{String(index + 1).padStart(2, "0")}</span>
                <Icon size={30} />
                <h2>{stage.title}</h2>
                <span>{stage.detail}</span>
                <strong>{stage.evidence}</strong>
              </div>
              {index < stages.length - 1 && <ArrowRight className="generation-arrow" size={26} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="run-proof">
        <div><span className="run-dot" /><strong>Run {comparison.pairId}</strong></div>
        <span>{correctedRun.environment.cliVersion.replace("codex-cli ", "Codex CLI ")}</span>
        <span>Model {correctedRun.environment.model}</span>
        <span>人は生成コードを直接修正していない</span>
      </div>
    </section>
  );
}

function ResultScene() {
  const navigate = useNavigate();
  const previews = [
    {
      condition: "baseline",
      title: "AIにIssueだけ渡す",
      caption: "設計指示なし・初回生成",
      evaluation: baselineEvaluation,
      tone: "baseline",
    },
    {
      condition: "harness-corrected",
      title: "Atlasを適用する",
      caption: "設計指示あり・検査後",
      evaluation: correctedEvaluation,
      tone: "atlas",
    },
  ] as const;
  return (
    <section className="demo-scene result-scene">
      <SceneHeading
        eyebrow="04 — 結果"
        title="設計指示があると、修正可能な実装になる"
        description="同じIssueから生成した画面です。差は、設計情報と検査結果を実装へ戻せるかどうかです。"
      />

      <div className="result-grid">
        {previews.map((preview) => (
          <article className={`site-card result-card result-card-${preview.tone}`} key={preview.condition}>
            <header>
              <div><p>{preview.caption}</p><h2>{preview.title}</h2></div>
              <div className="result-score"><strong>{preview.evaluation.summary.failed}</strong><span>設計違反</span></div>
            </header>
            <div className="result-image"><img alt={`${preview.title}で生成した顧客管理画面`} src={`/experiments/account-management/runs/mvp-11/${preview.condition}.png`} /></div>
            <footer><span>{preview.evaluation.summary.passed} 合格</span><span className={preview.evaluation.summary.failed === 0 ? "result-pass" : "result-fail"}>{preview.evaluation.summary.failed} 違反</span><span>{preview.evaluation.summary.review} 要確認</span></footer>
          </article>
        ))}
      </div>
      <p className="result-conclusion">初回出力の見た目を競うのではなく、既存ルールで検査し、直せる状態を作る。</p>
      <div className="result-actions" aria-label="生成された画面を操作する">
        <Button variant="secondary" onPress={() => navigate("/play/account-management?mode=baseline")}>設計指示なしの画面を操作する</Button>
        <Button variant="primary" onPress={() => navigate("/play/account-management?mode=atlas")}>Atlas適用後の画面を操作する <ArrowRight size={16} /></Button>
      </div>
    </section>
  );
}

const sceneComponents = [IssueScene, ApplyScene, GenerateScene, ResultScene];

export function DemoPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScene = searchParams.get("scene");
  const requestedIndex = scenes.findIndex((scene) => scene.id === requestedScene);
  const currentIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const CurrentScene = sceneComponents[currentIndex]!;

  const updateScene = (nextIndex: number) => {
    const safeIndex = Math.min(Math.max(nextIndex, 0), scenes.length - 1);
    setSearchParams({ scene: scenes[safeIndex]!.id }, { replace: true });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === "ArrowRight") updateScene(currentIndex + 1);
      else if (event.key === "ArrowLeft") updateScene(currentIndex - 1);
      else if (event.key.toLowerCase() === "r") updateScene(0);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="demo-shell">
      <header className="demo-header">
        <div className="demo-brand"><Button aria-label="Atlas Design Systemへ戻る" isIconOnly size="sm" variant="ghost" onPress={() => navigate("/")}><X size={18} /></Button><strong>Atlas 実装比較デモ</strong></div>
        <div className="demo-position" aria-label={`${currentIndex + 1} / ${scenes.length}`}><span>{String(currentIndex + 1).padStart(2, "0")}</span><i />{String(scenes.length).padStart(2, "0")}</div>
        <Button size="sm" variant="ghost" onPress={() => updateScene(0)}><RotateCcw size={16} />最初から</Button>
      </header>

      <main className="demo-stage" id="demo-content"><CurrentScene /></main>

      <footer className="demo-footer">
        <nav className="scene-navigation" aria-label="デモの場面">
          {scenes.map((scene, index) => (
            <Button
              aria-label={`${scene.number} ${scene.label}`}
              aria-current={index === currentIndex ? "step" : undefined}
              className={index === currentIndex ? "scene-nav-item scene-nav-item-active" : index < currentIndex ? "scene-nav-item scene-nav-item-done" : "scene-nav-item"}
              key={scene.id}
              size="sm"
              variant="ghost"
              onPress={() => updateScene(index)}
            >
              <span>{scene.number}</span><strong>{scene.label}</strong>
            </Button>
          ))}
        </nav>
        <ButtonGroup size="sm" variant="secondary">
          <Button aria-label="前へ" isDisabled={currentIndex === 0} onPress={() => updateScene(currentIndex - 1)}><ArrowLeft size={16} />前へ</Button>
          <Button aria-label="次へ" isDisabled={currentIndex === scenes.length - 1} onPress={() => updateScene(currentIndex + 1)}>次へ<ArrowRight size={16} /></Button>
        </ButtonGroup>
      </footer>
    </div>
  );
}
