import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Chip,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  Link as HeroLink,
  ListBox,
  NumberField,
  Select,
  Separator,
  SearchField,
  Surface,
  Table,
  TextField,
  Toolbar,
  Toast,
  useOverlayState,
} from "@heroui/react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Code2, Copy, FileCode2, FileText, FlaskConical, GitFork, LayoutTemplate, Monitor, Plug, ScanSearch, Smartphone, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  accountManagementTableUsage,
  createAccountManagementTableCodeExample,
  designData,
  type AccountManagementTableColumnId,
} from "../data/design";

const docsToastQueue = new Toast.Queue({
  // HeroUI's default queue starts a document-wide View Transition. Keep the
  // persistent docs navigation out of a transient notification update.
  wrapUpdate: (update) => update(),
});

function showCustomerUpdateToast() {
  docsToastQueue.add(
    {
      title: "顧客情報を更新しました",
      description: "株式会社ノーススターの連絡先とステータスを更新しました。",
      variant: "success",
    },
    { timeout: 5000 },
  );
}

function AtlasToastProvider() {
  return (
    <Toast.Provider queue={docsToastQueue} placement="bottom end">
      {({ toast }) => {
        const content = toast.content;
        return (
          <Toast toast={toast} variant={content.variant} placement="bottom end">
            <Toast.Indicator variant={content.variant}>{content.indicator}</Toast.Indicator>
            <Toast.Content>
              {content.title && <Toast.Title>{content.title}</Toast.Title>}
              {content.description && <Toast.Description>{content.description}</Toast.Description>}
            </Toast.Content>
            <Toast.CloseButton aria-label="通知を閉じる" />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </header>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  return (
    <article className="doc-page home-page">
      <PageHeader
        title="Atlas Design System"
        description="Design Harnessを用いて設計・検証する、デモ用のデザインシステムです。"
      />
      <div className="hero-actions">
        <Button variant="primary" size="lg" onPress={() => navigate("/getting-started")}>
          導入方法を見る <ArrowRight size={16} />
        </Button>
        <Button variant="secondary" size="lg" onPress={() => navigate("/demo/runs/account-management")}>
          実装比較デモを見る
        </Button>
      </div>

      <Separator className="section-separator" />

      <section aria-labelledby="flow-title">
        <div className="section-heading">
          <h2 id="flow-title">画面を作るための判断を定義する</h2>
        </div>
        <ol className="flow-list">
          <li><Link className="site-card flow-card-link" to="/foundations"><span>01</span><div><h3>基礎</h3><p>色、文字、余白、角丸、影のセマンティックトークン。</p></div><ArrowRight size={18} /></Link></li>
          <li><Link className="site-card flow-card-link" to="/components"><span>02</span><div><h3>コンポーネント</h3><p>採用するHeroUI部品と、使い方の契約。</p></div><ArrowRight size={18} /></Link></li>
          <li><Link className="site-card flow-card-link" to="/patterns/page-layout"><span>03</span><div><h3>パターン</h3><p>業務オブジェクトの関係から選ぶ、再利用可能なページ構造。</p></div><ArrowRight size={18} /></Link></li>
          <li><Link className="site-card flow-card-link" to="/rules"><span>04</span><div><h3>検証ルール</h3><p>実装後に自動検査する設計ルール。</p></div><ArrowRight size={18} /></Link></li>
        </ol>
      </section>

      <section className="source-section" aria-labelledby="source-title">
        <div className="section-heading">
          <h2 id="source-title">人とAIが同じ仕様を読む</h2>
          <p>公開ページ、AIへの入力、自動検証は同じ設計データを参照します。</p>
        </div>
        <div className="source-list">
          <div><FileCode2 size={18} /><code>DESIGN.md</code><span>参照ガイド</span></div>
          <div><Code2 size={18} /><code>design/tokens.json</code><span>設計トークン</span></div>
          <div><ScanSearch size={18} /><code>design/components/</code><span>利用条件</span></div>
          <div><LayoutTemplate size={18} /><code>design/patterns/</code><span>画面構造</span></div>
          <div><FileText size={18} /><code>design/examples/</code><span>機能の構成例</span></div>
          <div><FlaskConical size={18} /><code>design/rules.json</code><span>検証ルール</span></div>
        </div>
      </section>
    </article>
  );
}

const setupMethods = [
  {
    icon: GitFork,
    title: "GitHub",
    status: "初回推奨・公開準備中",
    description: "リポジトリを複製し、設計データ、検証スクリプト、デモ画面をまとめて手元で動かします。",
    command: "git clone <repository-url>\ncd <repository-directory>\npnpm install --frozen-lockfile\npnpm dev",
    prerequisite: "公開後のGitHub URLと、Node.js 24、pnpm 11が必要です。",
    verification: "pnpm demo:check",
    update: "git pull --ff-only\npnpm install --frozen-lockfile\npnpm demo:check",
  },
  {
    icon: Sparkles,
    title: "Skill",
    status: "リポジトリ内で利用可",
    description: "Atlasの設計判断、HeroUI v3の実装仕様、日本語UI文言の基準をAIエージェントへ渡します。",
    command: "node scripts/resolve-design-contract.mjs experiments/account-management/manifest.json",
    prerequisite: "Atlasリポジトリのルートで実行します。",
    verification: "pnpm skills:check",
    update: "git pull --ff-only\npnpm skills:check",
  },
  {
    icon: Plug,
    title: "MCP",
    status: "リポジトリ内で利用可",
    description: "必要な設計契約をAIエージェントが検索し、実装時に参照できる接続方法です。",
    command: "pnpm mcp:start",
    prerequisite: "stdio接続に対応したMCPクライアントが必要です。",
    verification: "pnpm exec vitest run scripts/mcp/server.test.mjs",
    update: "git pull --ff-only\npnpm install --frozen-lockfile\npnpm exec vitest run scripts/mcp/server.test.mjs",
  },
] as const;

function SetupCommand({ title, command }: { title: string; command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API is unavailable");
      await Promise.race([
        navigator.clipboard.writeText(command),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Clipboard API timed out")), 1000)),
      ]);
      setCopied(true);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = command;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      setCopied(document.execCommand("copy"));
      textarea.remove();
    }
  };

  return (
    <div className="setup-command">
      <pre><code>{command}</code></pre>
      <Button
        aria-label={copied ? `${title}の導入コマンドをコピーしました` : `${title}の導入コマンドをコピー`}
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={copy}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
    </div>
  );
}

export function GettingStartedPage() {
  return (
    <article className="doc-page">
      <PageHeader
        title="導入方法"
        description="Atlasは、リポジトリ、Skill、MCPの三つの方法で利用できる構成を目指しています。現在利用できる範囲を確認してください。"
      />

      <section className="setup-grid" aria-label="導入方法の一覧">
        {setupMethods.map(({ icon: Icon, title, status, description, command, prerequisite, verification, update }) => (
          <article className="site-card setup-card" key={title}>
            <div className="setup-card-heading">
              <span className="setup-icon"><Icon size={20} /></span>
              <Chip size="sm" variant="soft">{status}</Chip>
            </div>
            <h2>{title}</h2>
            <p>{description}</p>
            <dl className="setup-details">
              <div><dt>前提</dt><dd>{prerequisite}</dd></div>
              <div><dt>導入</dt><dd>下のコマンドを順に実行します。</dd></div>
              <div><dt>確認</dt><dd><code>{verification}</code></dd></div>
              <div><dt>更新</dt><dd><pre className="setup-update"><code>{update}</code></pre></dd></div>
            </dl>
            <SetupCommand command={command} title={title} />
          </article>
        ))}
      </section>

      <section className="local-setup" aria-labelledby="local-setup-title">
        <div className="section-heading">
          <h2 id="local-setup-title">このリポジトリを手元で動かす</h2>
          <p>依存パッケージを入れて開発サーバーを起動すると、デザインシステムと比較デモを確認できます。</p>
        </div>
        <pre><code>{`pnpm install\npnpm dev`}</code></pre>
        <p className="setup-note">ブラウザで <code>http://localhost:4173</code> を開きます。</p>
      </section>

      <section className="client-setup" aria-labelledby="client-setup-title">
        <div className="section-heading">
          <h2 id="client-setup-title">MCPクライアントへ接続する</h2>
          <p><code>/absolute/path/to/atlas-design-system-demo</code>は、cloneしたディレクトリの絶対パスへ置き換えます。</p>
        </div>
        <div className="client-setup-grid">
          <article>
            <h3>Codex</h3>
            <SetupCommand title="Codex MCP" command={'codex mcp add atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start\ncodex mcp get atlas-design-system'} />
            <p>削除: <code>codex mcp remove atlas-design-system</code></p>
          </article>
          <article>
            <h3>Claude Code</h3>
            <SetupCommand title="Claude Code MCP" command={'claude mcp add --scope project atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start\nclaude mcp get atlas-design-system'} />
            <p>削除: <code>claude mcp remove --scope project atlas-design-system</code></p>
          </article>
        </div>
      </section>
    </article>
  );
}

const implementationStack = [
  { name: "アプリケーション", value: "React 19.2.8 / TypeScript 6.0.3", description: "画面と設計データを型付きのコンポーネントとして実装します。" },
  { name: "開発環境", value: "Vite 8.2.2", description: "開発サーバーと公開用ビルドを担います。" },
  { name: "UIライブラリ", value: "HeroUI 3.2.4", description: "操作部品の実装基盤です。Atlasでは利用できる部品とバリエーションを限定します。" },
  { name: "書体", value: "Gen Interface JP 0.8.0", description: "本文は16pxを基準にし、見出しにはDisplay書体を使います。" },
  { name: "アイコン", value: "Lucide React 1.37.0", description: "機能を補助するアイコンを一つのセットに統一します。" },
  { name: "ルーティング", value: "React Router DOM 7.18.3", description: "ドキュメント、比較デモ、操作画面をURLで分けます。" },
] as const;

const designContractStack = [
  { name: "設計データ", value: "JSON", description: "トークン、コンポーネント、パターン、利用例、検証ルールを機械可読な形式で管理します。" },
  { name: "データ検証", value: "JSON Schema / Ajv 8.20.0", description: "設計データの構造と参照先をビルド前に検査します。" },
  { name: "AIからの参照", value: "Agent Skill / MCP", description: "AIが必要な設計契約を検索し、実装時の入力として使えるようにします。" },
  { name: "品質確認", value: "Vitest / Testing Library / Playwright / ESLint", description: "型、振る舞い、画面、設計ルールを別々に確認します。" },
] as const;

export function TechnicalSpecsPage() {
  return (
    <article className="doc-page">
      <PageHeader
        title="技術仕様"
        description="Atlas Design Systemを実装し、AIから参照し、検証するための構成です。バージョンはこのリポジトリで固定している値を示します。"
      />

      <section className="spec-section" aria-labelledby="implementation-stack-title">
        <h2 id="implementation-stack-title">実装基盤</h2>
        <dl className="spec-list">
          {implementationStack.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd><strong>{item.value}</strong><span>{item.description}</span></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="spec-section" aria-labelledby="design-contract-stack-title">
        <h2 id="design-contract-stack-title">設計契約と検証</h2>
        <dl className="spec-list">
          {designContractStack.map((item) => (
            <div key={item.name}>
              <dt>{item.name}</dt>
              <dd><strong>{item.value}</strong><span>{item.description}</span></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="spec-section" aria-labelledby="source-structure-title">
        <h2 id="source-structure-title">主なファイル</h2>
        <div className="file-reference-list">
          <div><code>design/tokens.json</code><span>色、文字、余白、角丸、影の基準値</span></div>
          <div><code>design/components/*.json</code><span>HeroUIコンポーネントの利用条件</span></div>
          <div><code>design/patterns/*.json</code><span>再利用できる画面構造</span></div>
          <div><code>design/rules.json</code><span>自動検査とレビューのルール</span></div>
          <div><code>skills/atlas-design-system/</code><span>AIエージェント向けの実装手順</span></div>
          <div><code>scripts/mcp/server.mjs</code><span>設計データを読み出すMCPサーバー</span></div>
        </div>
      </section>
    </article>
  );
}

const contentTokenLabels: Record<string, string> = {
  maxWidth: "ページ全体の最大幅",
  readingWidth: "本文を読みやすい幅",
};

const breakpointTokenLabels: Record<string, string> = {
  narrow: "狭い画面へ積み替える幅",
};

export function FoundationsPage() {
  return (
    <article className="doc-page">
      <PageHeader title="基礎" description="HeroUIのテーマへ対応付ける、プロジェクト固有のセマンティックトークンです。" />
      <section className="token-section">
        <h2>色</h2>
        <div className="swatch-grid">
          {Object.entries(designData.tokens.color).map(([name, value]) => (
            <div className="site-card swatch" key={name}>
              <span style={{ background: value }} />
              <div><strong>{name}</strong><code>{value}</code></div>
            </div>
          ))}
        </div>
      </section>
      <section className="token-section">
        <h2>余白</h2>
        <ul className="spacing-preview-list" aria-label="余白トークンの実寸プレビュー">
          {Object.entries(designData.tokens.space).map(([name, value]) => (
            <li key={name}>
              <div><code>space.{name}</code><span>{value}</span></div>
              <span className="spacing-preview-track" aria-hidden="true"><i style={{ width: value }} /></span>
            </li>
          ))}
        </ul>
      </section>
      <section className="token-section">
        <h2>幅</h2>
        <p className="token-section-description">ページの最大幅と、狭い画面へ積み替える基準はここで一度だけ決めます。画面ごとに別の値を持ち込みません。</p>
        <dl className="measure-token-list">
          {Object.entries(designData.tokens.content).map(([name, value]) => (
            <div key={name}>
              <dt>{contentTokenLabels[name] ?? name}<code>content.{name}</code></dt>
              <dd>{value}</dd>
            </div>
          ))}
          {Object.entries(designData.tokens.breakpoint).map(([name, value]) => (
            <div key={name}>
              <dt>{breakpointTokenLabels[name] ?? name}<code>breakpoint.{name}</code></dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="token-section">
        <h2>角丸</h2>
        <div className="radius-preview-list">
          {Object.entries(designData.tokens.radius).map(([name, value]) => (
            <figure className="site-card" key={name}>
              <div className="radius-preview-canvas" aria-hidden="true">
                <div
                  className={`radius-preview-shape radius-preview-shape-${name}`}
                  style={{ borderRadius: value }}
                />
              </div>
              <figcaption>
                <strong>{name === "base" ? "基本" : name === "pill" ? "カプセル" : "正円"}</strong>
                <span>{value}</span>
              </figcaption>
              <code>radius.{name}</code>
            </figure>
          ))}
        </div>
      </section>
      <section className="token-section">
        <h2>影</h2>
        <p className="token-section-description">Cardは背景から一段持ち上げるためにshadow.raisedを使います。Tableや区切りの構造は境界線と余白で表します。</p>
        <div className="shadow-preview-list" aria-label="影トークンの実寸プレビュー">
          {Object.entries(designData.tokens.shadow).map(([name, value]) => (
            <figure className="site-card" key={name}>
              <div className="shadow-preview-canvas" aria-hidden="true">
                <div className="shadow-preview-shape" style={{ boxShadow: value }} />
              </div>
              <figcaption>
                <strong>{name === "none" ? "影なし" : name === "raised" ? "持ち上がった面" : name === "dragging" ? "ドラッグ中" : name === "overlay" ? "オーバーレイ" : "フローティング"}</strong>
                <code>shadow.{name}</code>
              </figcaption>
              <p>{name === "none" ? "Table、影を持たないフラットな領域" : name === "raised" ? "Card" : name === "dragging" ? "ドラッグ中の要素" : name === "overlay" ? "Drawer、Dialog、Popover" : "Toast、画面上に固定する操作"}</p>
            </figure>
          ))}
        </div>
      </section>
      <section className="token-section">
        <h2>文字</h2>
        <div className="type-preview-list">
          {Object.entries(designData.tokens.type).map(([name, value]) => (
            <figure key={name}>
              <figcaption><code>type.{name}</code><span>{value}</span></figcaption>
              <p
                className={name.startsWith("lineHeight") ? "type-preview-line-height" : "type-preview-size"}
                style={name.startsWith("lineHeight") ? { lineHeight: value } : { fontSize: value }}
              >
                {name.startsWith("lineHeight")
                  ? "読みやすい行間は、情報を追いやすくし、業務画面での見落としを減らします。"
                  : name === "small" || name === "label"
                    ? "最終対応日 2026年8月31日"
                    : "顧客情報"}
              </p>
            </figure>
          ))}
        </div>
      </section>
    </article>
  );
}

const componentPreviewStatuses = [
  { id: "prospect", label: "商談中" },
  { id: "active", label: "利用中" },
  { id: "dormant", label: "休眠" },
];

const componentPreviewCustomers = [
  { id: "atlas", companyName: "アトラス株式会社", contactName: "佐藤 葵", lastContactedAt: "2026/08/28", status: "利用中", color: "success" },
  { id: "hokuto", companyName: "北斗物流株式会社", contactName: "田中 司", lastContactedAt: "2026/08/26", status: "商談中", color: "warning" },
  { id: "aoba", companyName: "青葉商事株式会社", contactName: "鈴木 凪", lastContactedAt: "2026/08/22", status: "利用中", color: "success" },
  { id: "nagumo", companyName: "南雲製作所", contactName: "伊藤 澪", lastContactedAt: "2026/07/18", status: "休眠", color: "default" },
] as const;

function renderComponentPreviewTableCell(
  customer: (typeof componentPreviewCustomers)[number],
  columnId: AccountManagementTableColumnId,
) {
  if (columnId === "companyName") {
    return <HeroLink href={`#/customers/${customer.id}`}>{customer.companyName}</HeroLink>;
  }
  if (columnId === "status") {
    return <Chip color={customer.color} size="sm" variant="soft">{customer.status}</Chip>;
  }
  return customer[columnId];
}

const componentCodeExamples: Record<string, string> = {
  "component.button": `import { Button } from "@heroui/react";

export function Actions() {
  return (
    <div className="flex gap-3">
      <Button variant="primary">保存</Button>
      <Button variant="secondary">取り消す</Button>
      <Button variant="danger">削除</Button>
    </div>
  );
}`,
  "component.link": `import { Link } from "@heroui/react";

export function CustomerDetailLink() {
  return (
    <Link href="#/customers/customer_northstar">
      株式会社ノーススター
    </Link>
  );
}`,
  "component.table": createAccountManagementTableCodeExample(),
  "component.toolbar": `import { SearchField, Toolbar } from "@heroui/react";

export function CustomerListToolbar() {
  return (
    <Toolbar aria-label="顧客一覧の操作" className="justify-end">
      <SearchField aria-label="企業名で検索" className="w-full max-w-64">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="企業名で検索" />
          <SearchField.ClearButton aria-label="検索語をクリア" />
        </SearchField.Group>
      </SearchField>
    </Toolbar>
  );
}`,
  "component.search-field": `import { SearchField } from "@heroui/react";

export function CustomerSearch() {
  return (
    <SearchField aria-label="企業名で検索">
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="企業名で検索" />
        <SearchField.ClearButton aria-label="検索語をクリア" />
      </SearchField.Group>
    </SearchField>
  );
}`,
  "component.card": `import { Card } from "@heroui/react";

export function CustomerSummary() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>顧客情報</Card.Title>
        <Card.Description>選択中の顧客の基本情報です。</Card.Description>
      </Card.Header>
      <Card.Content>
        <strong>株式会社ノーススター / 佐藤 葵</strong>
      </Card.Content>
    </Card>
  );
}`,
  "component.text-field": `import { Description, FieldError, Input, Label, TextField } from "@heroui/react";

export function ContactEmailField() {
  return (
    <TextField isRequired name="email" type="email">
      <Label>メールアドレス</Label>
      <Input autoComplete="email" placeholder="name@example.com" />
      <Description>顧客への連絡に使用します。</Description>
      <FieldError>メールアドレスの形式を確認してください。</FieldError>
    </TextField>
  );
}`,
  "component.select": `import { Description, Label, ListBox, Select } from "@heroui/react";

const statuses = [
  { id: "prospect", label: "商談中" },
  { id: "active", label: "利用中" },
  { id: "dormant", label: "休眠" },
];

export function CustomerStatusSelect() {
  return (
    <Select aria-label="顧客ステータス" selectedKey="active">
      <Label>ステータス</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Description>現在の対応状況を選択します。</Description>
      <Select.Popover>
        <ListBox items={statuses}>
          {(item) => <ListBox.Item id={item.id}>{item.label}</ListBox.Item>}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}`,
  "component.number-field": `import { Description, Label, NumberField } from "@heroui/react";

export function EmployeeCountField() {
  return (
    <NumberField defaultValue={120} minValue={0}>
      <Label>従業員数</Label>
      <NumberField.Group>
        <NumberField.DecrementButton>-</NumberField.DecrementButton>
        <NumberField.Input />
        <NumberField.IncrementButton>+</NumberField.IncrementButton>
      </NumberField.Group>
      <Description>顧客企業の現在の従業員数を入力します。</Description>
    </NumberField>
  );
}`,
  "component.form": `import { Button, Description, FieldError, Form, Input, Label, TextField } from "@heroui/react";

export function CustomerRegistrationForm() {
  return (
    <Form className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
      <TextField isRequired name="companyName">
        <Label>会社名</Label>
        <Input placeholder="アトラス株式会社" />
        <Description>請求書に記載する正式名称を入力します。</Description>
        <FieldError>会社名を入力してください。</FieldError>
      </TextField>
      <Button type="submit" variant="primary">顧客を登録</Button>
    </Form>
  );
}`,
  "component.chip": `import { Chip } from "@heroui/react";

export function CustomerStatuses() {
  return (
    <div className="flex gap-2">
      <Chip color="warning" variant="soft">商談中</Chip>
      <Chip color="success" variant="soft">利用中</Chip>
      <Chip variant="soft">休眠</Chip>
    </div>
  );
}`,
  "component.surface": `import { Surface } from "@heroui/react";

export function CustomerSurface() {
  return (
    <Surface className="grid gap-2 border p-6">
      <strong>顧客情報</strong>
      <span>株式会社ノーススター・利用中</span>
    </Surface>
  );
}`,
  "component.drawer": `import { Button, Drawer, useOverlayState } from "@heroui/react";

export function CustomerDrawer() {
  const state = useOverlayState({});

  return (
    <Drawer.Root state={state}>
      <Drawer.Trigger>顧客情報を編集</Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog aria-label="顧客情報の編集">
            <Drawer.Header><Drawer.Heading>顧客情報を編集</Drawer.Heading></Drawer.Header>
            <Drawer.Body>会社名、担当者、連絡先、ステータスを変更します。</Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" onPress={state.close}>閉じる</Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}`,
  "component.alert-dialog": `import { AlertDialog, Button } from "@heroui/react";

export function CustomerDeletion() {
  return (
    <AlertDialog.Root>
      <Button className="dialog-trigger-button" variant="danger">顧客を削除</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Heading>顧客を削除しますか</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>株式会社ノーススターの顧客情報が削除されます。</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="secondary">戻る</Button>
              <Button slot="close" variant="danger">顧客を削除</Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}`,
  "component.alert": `import { Alert } from "@heroui/react";

export function CustomerSaveResult() {
  return (
    <div className="grid gap-4">
      <Alert.Root status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>顧客情報を保存できませんでした</Alert.Title>
          <Alert.Description>通信が中断されました。入力内容は残っています。もう一度保存してください。</Alert.Description>
        </Alert.Content>
      </Alert.Root>
      <Alert.Root status="success">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>顧客情報を保存しました</Alert.Title>
          <Alert.Description>株式会社ノーススターの連絡先とステータスを更新しました。</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    </div>
  );
}`,
  "component.toast": `import { Button, Toast } from "@heroui/react";

const toastQueue = new Toast.Queue({
  wrapUpdate: (update) => update(),
});

export function CustomerToast() {
  return (
    <>
      <Button
        variant="secondary"
        onPress={() => toastQueue.add({
          title: "顧客情報を更新しました",
          description: "株式会社ノーススターの連絡先とステータスを更新しました。",
          variant: "success",
        })}
      >
        更新結果を表示
      </Button>
      <Toast.Provider queue={toastQueue} placement="bottom end">
        {({toast}) => (
          <Toast toast={toast} variant={toast.content.variant} placement="bottom end">
            <Toast.Indicator variant={toast.content.variant} />
            <Toast.Content>
              <Toast.Title>{toast.content.title}</Toast.Title>
              <Toast.Description>{toast.content.description}</Toast.Description>
            </Toast.Content>
            <Toast.CloseButton aria-label="通知を閉じる" />
          </Toast>
        )}
      </Toast.Provider>
    </>
  );
}`,
};

function DrawerPreview() {
  const state = useOverlayState({});

  return (
    <Drawer.Root state={state}>
      <Drawer.Trigger className="button button--md button--secondary">顧客情報を編集</Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog aria-label="顧客情報の編集例">
            <Drawer.Header>
              <Drawer.Heading>顧客情報を編集</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <p>会社名、担当者、連絡先、ステータスを変更します。</p>
            </Drawer.Body>
            <Drawer.Footer>
              <Button variant="secondary" onPress={state.close}>閉じる</Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function ComponentPreview({ id }: { id: string }) {
  switch (id) {
    case "component.button":
      return (
        <div className="preview-actions">
          <Button variant="primary">保存</Button>
          <Button variant="secondary">取り消す</Button>
          <Button variant="danger">削除</Button>
        </div>
      );
    case "component.link":
      return <HeroLink href="#/customers/customer_northstar">株式会社ノーススター</HeroLink>;
    case "component.table":
      return (
        <Table.Root aria-label="顧客一覧の例" variant={accountManagementTableUsage.variant}>
          <Table.ScrollContainer>
            <Table.Content aria-label="顧客一覧の例">
              <Table.Header columns={accountManagementTableUsage.columns}>
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
              <Table.Body items={componentPreviewCustomers}>
                {(customer) => (
                  <Table.Row id={customer.id} columns={accountManagementTableUsage.columns}>
                    {(column) => (
                      <Table.Cell
                        className={column.tabular ? "table-cell-tabular" : undefined}
                        data-align={column.align}
                      >
                        {renderComponentPreviewTableCell(customer, column.id)}
                      </Table.Cell>
                    )}
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table.Root>
      );
    case "component.toolbar":
      return (
        <Toolbar aria-label="顧客一覧の操作" className="preview-toolbar">
          <SearchField aria-label="企業名で検索" className="preview-search-field">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="企業名で検索" />
              <SearchField.ClearButton aria-label="検索語をクリア" />
            </SearchField.Group>
          </SearchField>
        </Toolbar>
      );
    case "component.search-field":
      return (
        <SearchField aria-label="企業名で検索" className="preview-search-field">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="企業名で検索" />
            <SearchField.ClearButton aria-label="検索語をクリア" />
          </SearchField.Group>
        </SearchField>
      );
    case "component.card":
      return (
        <Card className="preview-card">
          <Card.Header>
            <Card.Title>顧客情報</Card.Title>
            <Card.Description>選択中の顧客の基本情報です。</Card.Description>
          </Card.Header>
          <Card.Content><strong>株式会社ノーススター / 佐藤 葵</strong></Card.Content>
        </Card>
      );
    case "component.text-field":
      return (
        <TextField isRequired name="email" type="email">
          <Label>メールアドレス</Label>
          <Input autoComplete="email" placeholder="name@example.com" />
          <Description>顧客への連絡に使用します。</Description>
          <FieldError>メールアドレスの形式を確認してください。</FieldError>
        </TextField>
      );
    case "component.select":
      return (
        <Select aria-label="顧客ステータス" selectedKey="active">
          <Label>ステータス</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Description>現在の対応状況を選択します。</Description>
          <Select.Popover>
            <ListBox items={componentPreviewStatuses}>
              {(item) => <ListBox.Item id={item.id}>{item.label}</ListBox.Item>}
            </ListBox>
          </Select.Popover>
        </Select>
      );
    case "component.number-field":
      return (
        <NumberField aria-label="従業員数" defaultValue={120} minValue={0}>
          <Label>従業員数</Label>
          <NumberField.Group>
            <NumberField.DecrementButton>-</NumberField.DecrementButton>
            <NumberField.Input />
            <NumberField.IncrementButton>+</NumberField.IncrementButton>
          </NumberField.Group>
          <Description>顧客企業の現在の従業員数を入力します。</Description>
        </NumberField>
      );
    case "component.form":
      return (
        <Form className="preview-form" onSubmit={(event) => event.preventDefault()}>
          <TextField isRequired name="companyName">
            <Label>会社名</Label>
            <Input placeholder="アトラス株式会社" />
            <Description>請求書に記載する正式名称を入力します。</Description>
            <FieldError>会社名を入力してください。</FieldError>
          </TextField>
          <Button type="submit" variant="primary">顧客を登録</Button>
        </Form>
      );
    case "component.chip":
      return (
        <div className="preview-actions">
          <Chip color="warning" variant="soft">商談中</Chip>
          <Chip color="success" variant="soft">利用中</Chip>
          <Chip variant="soft">休眠</Chip>
        </div>
      );
    case "component.surface":
      return <Surface className="preview-surface"><strong>顧客情報</strong><span>株式会社ノーススター・利用中</span></Surface>;
    case "component.drawer":
      return <DrawerPreview />;
    case "component.alert-dialog":
      return (
        <AlertDialog.Root>
          <Button className="dialog-trigger-button" variant="danger">顧客を削除</Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container size="md">
              <AlertDialog.Dialog>
                <AlertDialog.Header><AlertDialog.Heading>顧客を削除しますか</AlertDialog.Heading></AlertDialog.Header>
                <AlertDialog.Body>株式会社ノーススターの顧客情報が削除されます。</AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="secondary">戻る</Button>
                  <Button slot="close" variant="danger">顧客を削除</Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog.Root>
      );
    case "component.alert":
      return (
        <div className="preview-alert-list">
          <Alert.Root status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>顧客情報を保存できませんでした</Alert.Title>
              <Alert.Description>通信が中断されました。入力内容は残っています。もう一度保存してください。</Alert.Description>
            </Alert.Content>
          </Alert.Root>
          <Alert.Root status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>顧客情報を保存しました</Alert.Title>
              <Alert.Description>株式会社ノーススターの連絡先とステータスを更新しました。</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </div>
      );
    case "component.toast":
      return (
        <Button
          variant="secondary"
          onPress={showCustomerUpdateToast}
        >
          更新結果を表示
        </Button>
      );
    default:
      return null;
  }
}

function ComponentExample({ component }: { component: (typeof designData.components)[number] }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const source = componentCodeExamples[component.id]
    ?? `import { ${component.implementation} } from "${component.import}";`;
  const importStatement = source.split("\n", 1)[0];

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="component-example">
      <div className="component-example-import">
        <code>{importStatement}</code>
        <Button
          aria-label={`${component.name}のコード例をコピー`}
          className="component-copy-button"
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={copyCode}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      </div>
      <div className={`component-preview component-preview-${component.implementation.toLowerCase()}`}>
        <ComponentPreview id={component.id} />
      </div>
      <div className="component-example-footer">
        <Button
          aria-expanded={codeOpen}
          aria-label={`${component.name}のコードを${codeOpen ? "閉じる" : "表示"}`}
          size="sm"
          variant="ghost"
          onPress={() => setCodeOpen((open) => !open)}
        >
          <Code2 size={16} />
          {codeOpen ? "コードを閉じる" : "コードを表示"}
          {codeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      {codeOpen && (
        <pre className="component-code"><code>{source}</code></pre>
      )}
    </div>
  );
}

const surfaceOwnerLabels: Record<string, string> = {
  component: "コンポーネントが面を持つ",
  none: "面を持たない",
};

const outerShadowLabels: Record<string, string> = {
  required: "必須",
  allowed: "許可",
  forbidden: "禁止",
};

export function ComponentsPage() {
  return (
    <article className="doc-page">
      <PageHeader title="コンポーネント" description="業務画面で利用できるHeroUI部品と、その使い方を定義します。" />
      <section className="component-contracts" aria-labelledby="component-contracts-title">
        <h2 id="component-contracts-title">利用できる部品</h2>
        <div className="contract-list">
          {designData.components.map((component) => (
            <article className="component-entry" key={component.id}>
              <header className="component-entry-header">
                <div className="contract-title"><h2>{component.name}</h2><code>{component.id}</code></div>
              </header>
              <ComponentExample component={component} />
              <div className="component-contract-details">
                <div className="component-meta-list">
                  <div><p className="meta-label">利用できるバリエーション</p><p>{component.variants.join(", ")}</p></div>
                  <div><p className="meta-label">利用できるサイズ</p><p>{component.sizes.join(", ")}</p></div>
                  <div><p className="meta-label">既定のバリエーション</p><p>{component.defaults.variant}</p></div>
                  <div><p className="meta-label">既定のサイズ</p><p>{component.defaults.size}</p></div>
                  <div>
                    <p className="meta-label">面と影の扱い</p>
                    <p>
                      {surfaceOwnerLabels[component.visual.surfaceOwner] ?? component.visual.surfaceOwner}
                      、外側の影は{outerShadowLabels[component.visual.outerShadow] ?? component.visual.outerShadow}
                      、角丸は{component.visual.radiusToken}
                    </p>
                  </div>
                </div>
                <div className="component-requirement-list">
                  <ul>{component.requirements.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
                  <div>
                    <p className="meta-label">関連する検証ルール</p>
                    <div className="chip-list">{component.relatedRules.map((ruleId) => <Chip key={ruleId} size="sm" variant="soft">{ruleId}</Chip>)}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <AtlasToastProvider />
      </section>
    </article>
  );
}

// レイアウト契約を持たないvariantがあり、valuesのキーもvariantごとに異なる。
type ContractLayout = {
  breakpoint?: string;
  classes?: string[];
  values?: Record<string, string | undefined>;
};

function contractLayout(variant: { layout?: ContractLayout }) {
  return variant.layout;
}

function LayoutContractDetails({ label, layout }: { label: string; layout: ContractLayout }) {
  return (
    <div className="layout-contract">
      <p className="meta-label">{label}</p>
      {layout.breakpoint && <p className="layout-contract-breakpoint">切り替えの基準 {layout.breakpoint}</p>}
      {layout.classes && <div className="structure-list">{layout.classes.map((item) => <span key={item}>{item}</span>)}</div>}
      {layout.values && (
        <dl className="layout-contract-values">
          {Object.entries(layout.values).map(([name, value]) => (
            <div key={name}><dt>{name}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function PatternPage() {
  const { pattern } = designData;
  const navigate = useNavigate();
  return (
    <article className="doc-page">
      <PageHeader title={pattern.name} description={pattern.purpose} />

      <section className="pattern-section" aria-labelledby="principles-title">
        <div className="section-heading">
          <h2 id="principles-title">レイアウトを選ぶ前に決めること</h2>
        </div>
        <div className="principle-list">
          {pattern.principles.map((principle, index) => (
            <div className="site-card" key={principle.id}><span>0{index + 1}</span><div><h3>{principle.title}</h3><p>{principle.description}</p></div></div>
          ))}
        </div>
      </section>

      <section className="pattern-section anatomy-section" aria-labelledby="anatomy-title">
        <div className="section-heading">
          <h2 id="anatomy-title">ページの基本構造</h2>
          <p>必要な領域を同じ順序で配置し、画面ごとの学習コストを減らします。</p>
        </div>
        <div className="anatomy-layout">
          <div className="anatomy-preview" aria-hidden="true">
            {pattern.anatomy.map((part, index) => <div className={`anatomy-part anatomy-part-${part.id}`} key={part.id}><span>{index + 1}</span>{part.name}</div>)}
          </div>
          <ol className="anatomy-list">
            {pattern.anatomy.map((part, index) => (
              <li key={part.id}><span>{index + 1}</span><div><h3>{part.name}{!part.required && <small>任意</small>}</h3><p>{part.description}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="variants-title">
        <div className="section-heading">
          <h2 id="variants-title">業務オブジェクトの関係から選ぶ</h2>
          <p>画面名ではなく、比較するのか、一つを詳しく見るのか、頻繁に切り替えるのかで判断します。</p>
        </div>
        <div className="variant-grid">
          {pattern.variants.map((variant) => {
            const layout = contractLayout(variant);
            return (
              <article className="site-card variant-card" key={variant.id}>
                <div className="layout-preview" data-variant={variant.id} aria-hidden="true">
                  <i className="preview-header" /><i className="preview-heading" /><i className="preview-side" /><i className="preview-main" /><i className="preview-detail" />
                </div>
                <div className="variant-copy">
                  <h3>{variant.name}</h3>
                  <p>{variant.useWhen}</p>
                  <dl>
                    <div><dt><Monitor size={16} />デスクトップ</dt><dd>{variant.desktop}</dd></div>
                    <div><dt><Smartphone size={16} />狭い画面</dt><dd>{variant.narrow}</dd></div>
                  </dl>
                  <div className="structure-list">{variant.structure.map((item) => <span key={item}>{item}</span>)}</div>
                  {layout && <LayoutContractDetails label="実装で使うレイアウト値" layout={layout} />}
                  <p className="avoid-copy"><strong>避ける場面</strong>{variant.avoidWhen}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="pattern-states-title">
        <div className="section-heading">
          <h2 id="pattern-states-title">どのレイアウトでも用意する画面状態</h2>
          <p>データが揃った状態だけを設計せず、この状態をレイアウトの中で表示できるようにします。</p>
        </div>
        <div className="chip-list">{pattern.states.map((state) => <Chip key={state} size="sm" variant="soft">{state}</Chip>)}</div>
      </section>

      <section className="pattern-section responsive-section" aria-labelledby="responsive-title">
        <div className="responsive-icon"><Smartphone size={24} /></div>
        <div><h2 id="responsive-title">モバイルでは1カラムに積み替える</h2><p>主要情報から順に並べ、テーブルはリストへ、2カラムは別画面へ切り替えます。横スクロールをレイアウトの前提にしません。</p></div>
      </section>

      <section className="pattern-section example-callout" aria-labelledby="example-title">
        <div><h2 id="example-title">顧客管理</h2><p>一覧（テーブル）と詳細（1カラム）を別画面として組み合わせた構成を確認できます。</p></div>
        <Button variant="secondary" onPress={() => navigate("/examples/account-management")}>利用例を見る <ArrowRight size={16} /></Button>
      </section>
    </article>
  );
}

export function SpacingPatternPage() {
  const { spacingPattern } = designData;
  return (
    <article className="doc-page spacing-pattern-page">
      <PageHeader title={spacingPattern.name} description={spacingPattern.purpose} />

      <section className="pattern-section" aria-labelledby="spacing-principles-title">
        <div className="section-heading">
          <h2 id="spacing-principles-title">数値より先に、要素の関係を決める</h2>
          <p>余白は空いた場所を埋める値ではなく、情報のまとまりと読む順序を示すために使います。</p>
        </div>
        <div className="principle-list">
          {spacingPattern.principles.map((principle, index) => (
            <div className="site-card" key={principle.id}><span>0{index + 1}</span><div><h3>{principle.title}</h3><p>{principle.description}</p></div></div>
          ))}
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="spacing-grouping-title">
        <div className="section-heading">
          <h2 id="spacing-grouping-title">近い要素を同じまとまりにする</h2>
          <p>同じまとまりの中は狭く、まとまり同士は広く取ります。グループ間は、グループ内より一段以上大きなトークンを選びます。</p>
        </div>
        <div className="spacing-grouping-layout">
          <figure className="site-card spacing-grouping-preview" aria-label="グループ内を8px、グループ間を32px空けた例">
            <div className="spacing-demo-group">
              <span>会社名</span>
              <strong>サンプル株式会社</strong>
            </div>
            <div className="spacing-demo-measure"><i />space.8 / 32px</div>
            <div className="spacing-demo-group">
              <span>担当者</span>
              <strong>佐藤 葵</strong>
            </div>
            <figcaption>グループ内 <code>space.2</code> / グループ間 <code>space.8</code></figcaption>
          </figure>
          <ol className="spacing-anatomy-list">
            {spacingPattern.anatomy.map((item, index) => (
              <li key={item.id}><span>{index + 1}</span><div><h3>{item.name}</h3><p>{item.description}</p></div></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="spacing-types-title">
        <div className="section-heading">
          <h2 id="spacing-types-title">間隔と内側の余白を使い分ける</h2>
          <p>並列な要素同士の距離はgap、枠と内容の距離はpaddingで表します。意味の違う二つを同じ値として扱いません。</p>
        </div>
        <div className="spacing-type-grid">
          <figure className="site-card">
            <div className="spacing-gap-preview" aria-hidden="true"><i /><span>16px</span><i /></div>
            <figcaption><strong>要素間の距離</strong><span><code>gap</code>で並列関係を示す</span></figcaption>
          </figure>
          <figure className="site-card">
            <div className="spacing-padding-preview" aria-hidden="true"><span>24px</span><i>内容</i></div>
            <figcaption><strong>枠の内側</strong><span><code>padding</code>で内包関係を示す</span></figcaption>
          </figure>
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="spacing-recipes-title">
        <div className="section-heading">
          <h2 id="spacing-recipes-title">代表的な組み合わせ</h2>
          <p>個別の値を足し引きする前に、配置する場所に近い組み合わせを選びます。</p>
        </div>
        <div className="spacing-recipe-list">
          {spacingPattern.variants.map((variant) => {
            const layout = contractLayout(variant);
            return (
              <article key={variant.id}>
                <header><h3>{variant.name}</h3><code>{variant.id}</code></header>
                <p>{variant.useWhen}</p>
                <dl>
                  <div><dt>デスクトップ</dt><dd>{variant.desktop}</dd></div>
                  <div><dt>狭い画面</dt><dd>{variant.narrow}</dd></div>
                </dl>
                <div className="spacing-token-row">{variant.structure.map((item) => <span key={item}>{item}</span>)}</div>
                {layout && <LayoutContractDetails label="実装で使う余白トークン" layout={layout} />}
              </article>
            );
          })}
        </div>
      </section>

      <section className="pattern-section responsive-section" aria-labelledby="spacing-responsive-title">
        <div className="responsive-icon"><Smartphone size={24} /></div>
        <div><h2 id="spacing-responsive-title">狭い画面では外周のpaddingを縮める</h2><p>左右の外周は32pxから16pxへ縮めます。情報の関係を示すセクション間や要素間のgapは原則として維持し、幅が足りなければ縦に積み替えます。</p></div>
      </section>

      <section className="pattern-section spacing-contract" aria-labelledby="spacing-contract-title">
        <div><h2 id="spacing-contract-title">Design Harnessから参照する</h2><p>余白の判断を生成時に適用する場合は、このパターンIDとトークンを設計契約へ含めます。</p></div>
        <div><code>pattern.spacing-layout</code><code>design/patterns/spacing-layout.json</code></div>
      </section>
    </article>
  );
}

function componentContractName(componentId: string) {
  return designData.components.find((component) => component.id === componentId)?.name ?? componentId;
}

function ruleContractTitle(ruleId: string) {
  return designData.rules.find((rule) => rule.id === ruleId)?.title ?? ruleId;
}

export function ExamplePage() {
  const { example, pattern } = designData;
  const navigate = useNavigate();
  const variant = pattern.variants.find((item) => item.id === example.variant);
  const detailVariant = pattern.variants.find((item) => item.id === "single-one-column");

  return (
    <article className="doc-page">
      <PageHeader title={example.name} description={example.purpose} />
      <section className="reference-strip" aria-label="参照する設計契約">
        <LayoutTemplate size={20} />
        <div><span>パターン / 種類</span><strong>{pattern.name} / {variant?.name} → {detailVariant?.name}</strong></div>
        <code>{example.pattern}#{example.variant} + #single-one-column</code>
      </section>

      <section className="example-grid" aria-labelledby="composition-title">
        <div>
          <h2 id="composition-title">Issueを画面構造へ変換する</h2>
          <ol className="composition-list">{example.composition.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}</ol>
        </div>
        <aside className="contract-reference" aria-label="実装時に参照する契約">
          <div><p className="meta-label">必要な画面状態</p><div className="chip-list">{example.states.map((state) => <Chip key={state} size="sm" variant="soft">{state}</Chip>)}</div></div>
          <div>
            <p className="meta-label">組み合わせるコンポーネント</p>
            <div className="chip-list">{example.components.map((componentId) => <Chip key={componentId} size="sm" variant="soft">{componentContractName(componentId)}</Chip>)}</div>
          </div>
          <div>
            <p className="meta-label">満たす検証ルール</p>
            <ul className="example-rule-list">
              {example.rules.map((ruleId) => <li key={ruleId}>{ruleContractTitle(ruleId)}<code>{ruleId}</code></li>)}
            </ul>
          </div>
          <div><p className="meta-label">参照する設計データ</p><code>design/examples/account-management.json</code><code>design/patterns/page-layout.json</code><code>design/rules.json</code></div>
        </aside>
      </section>

      <section className="pattern-section harness-contract" aria-labelledby="harness-contract-title">
        <div><h2 id="harness-contract-title">AIへ参照IDを渡す</h2><p>Issueそのものは変えず、Design Harnessを適用した場合だけパターン、利用例、コンポーネント、検証ルールを追加で読みます。</p></div>
        <div className="reference-code"><span>一覧</span><code>{example.pattern}#{example.variant}</code><span>詳細</span><code>{example.pattern}#single-one-column</code><span>利用例</span><code>{example.id}</code></div>
      </section>

      <Button variant="primary" onPress={() => navigate("/play/account-management?mode=atlas")}>生成された画面を操作する <ArrowRight size={16} /></Button>
    </article>
  );
}

const ruleMethodLabels: Record<string, string> = {
  automatic: "自動検証",
  "ai-review": "AIレビュー",
  human: "人の判断",
};

export function RulesPage() {
  return (
    <article className="doc-page">
      <PageHeader title="検証ルール" description="自動検証、AIレビュー、人の判断を混ぜずに管理します。" />
      <div className="rules-table" role="table" aria-label="検証ルール一覧">
        <div className="rules-row rules-head" role="row"><span>ルール</span><span>確認方法</span><span>重要度</span></div>
        {designData.rules.map((rule) => (
          <div className="rules-row" role="row" key={rule.id}>
            <div>
              <strong>{rule.title}</strong>
              <div className="rules-identity"><code>{rule.id}</code><span className="rules-category">{rule.category}</span></div>
              <p>{rule.description}</p>
            </div>
            <span>{ruleMethodLabels[rule.method] ?? rule.method}</span>
            <Chip size="sm" variant="soft">{rule.severity}</Chip>
          </div>
        ))}
      </div>
    </article>
  );
}
