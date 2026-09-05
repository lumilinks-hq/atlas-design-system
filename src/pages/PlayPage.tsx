import { Button, Chip, Label, ListBox, Select } from "@heroui/react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { experimentRuns, type ExperimentId } from "../data/runs";

type PlayMode = "atlas" | "baseline";
type PlayModeInfo = { button: string; title: string; description: string; entry: string };
type PlayState = { id: string; label: string; route: string };

const descriptions: Record<PlayMode, string> = {
  atlas: "ページ構造、コンポーネント、状態、検証ルールを参照して生成した画面です。",
  baseline: "同じIssueだけをAIへ渡し、Atlasの設計情報を使わずに生成した画面です。",
};

/** 題材ごとのPlay画面。HTMLエントリと、再現できる状態の一覧を持つ */
const playScreens: Record<ExperimentId, { modes: Record<PlayMode, PlayModeInfo>; states: PlayState[] }> = {
  "account-management": {
    modes: {
      atlas: {
        button: "Atlas適用後",
        title: "Atlas適用後の顧客管理画面",
        description: descriptions.atlas,
        entry: "/play-atlas.html",
      },
      baseline: {
        button: "設計指示なし",
        title: "設計指示なしの顧客管理画面",
        description: descriptions.baseline,
        entry: "/play-baseline.html",
      },
    },
    states: [
      { id: "default", label: "通常", route: "/customers" },
      { id: "empty", label: "検索結果なし", route: "/customers" },
      { id: "drawer-open", label: "編集を開く", route: "/customers/customer_northstar" },
      { id: "invalid-email", label: "入力エラー", route: "/customers/customer_northstar" },
      { id: "loading", label: "保存中", route: "/customers/customer_northstar" },
      { id: "success", label: "保存成功", route: "/customers/customer_northstar" },
      { id: "failure", label: "保存失敗", route: "/customers/customer_northstar" },
      { id: "delete-confirm", label: "削除を確認", route: "/customers/customer_northstar" },
    ],
  },
  "invoice-management": {
    modes: {
      atlas: {
        button: "Atlas適用後",
        title: "Atlas適用後の請求書管理画面",
        description: descriptions.atlas,
        entry: "/play-invoice-atlas.html",
      },
      baseline: {
        button: "設計指示なし",
        title: "設計指示なしの請求書管理画面",
        description: descriptions.baseline,
        entry: "/play-invoice-baseline.html",
      },
    },
    states: [
      { id: "default", label: "通常", route: "/invoices" },
      { id: "empty", label: "検索結果なし", route: "/invoices" },
      { id: "drawer-open", label: "編集を開く", route: "/invoices/invoice_2026_0142" },
      { id: "invalid-due-date", label: "入力エラー", route: "/invoices/invoice_2026_0142" },
      { id: "loading", label: "保存中", route: "/invoices/invoice_2026_0142" },
      { id: "success", label: "保存成功", route: "/invoices/invoice_2026_0142" },
      { id: "failure", label: "保存失敗", route: "/invoices/invoice_2026_0142" },
      { id: "void-confirm", label: "無効化を確認", route: "/invoices/invoice_2026_0142" },
    ],
  },
};

export function PlayPage({ experiment }: { experiment: ExperimentId }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = playScreens[experiment];
  const requestedMode = searchParams.get("mode");
  const mode: PlayMode = requestedMode === "baseline" ? "baseline" : "atlas";
  const requestedState = searchParams.get("state");
  const currentState = screen.states.find((item) => item.id === requestedState) ?? screen.states[0]!;
  const state = currentState.id;
  const current = screen.modes[mode];
  const frameSrc = `${current.entry}#${currentState.route}?state=${state}`;

  useEffect(() => {
    document.title = "生成された画面を操作する — Atlas Design System";
  }, []);

  const selectMode = (nextMode: PlayMode) => {
    setSearchParams({ mode: nextMode, state });
  };

  const selectState = (nextState: string) => setSearchParams({ mode, state: nextState });

  return (
    <main className="play-shell">
      <header className="play-header">
        <Button
          aria-label="サンプルへ戻る"
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={() => navigate(experimentRuns[experiment].examplePath)}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="play-title">
          <span>Atlas Design System</span>
          <h1>生成された画面を操作する</h1>
        </div>
      </header>

      <section className="play-toolbar" aria-label="表示する実装を選ぶ">
        <div className="play-modes">
          {(Object.keys(screen.modes) as PlayMode[]).map((item) => (
            <Button
              aria-pressed={mode === item}
              key={item}
              size="sm"
              variant={mode === item ? "primary" : "secondary"}
              onPress={() => selectMode(item)}
            >
              {screen.modes[item].button}
            </Button>
          ))}
        </div>
        <div className="play-description" aria-live="polite">
          <Chip size="sm" variant="soft">{mode === "atlas" ? "ハーネスあり" : "ハーネスなし"}</Chip>
          <p>{current.description}</p>
        </div>
        <Select
          aria-label="再現する状態"
          className="play-state-select"
          selectedKey={state}
          variant="secondary"
          onSelectionChange={(key) => {
            if (typeof key === "string") selectState(key);
          }}
        >
          <Label>状態</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox items={screen.states}>{(item) => <ListBox.Item id={item.id} textValue={item.label}>{item.label}</ListBox.Item>}</ListBox>
          </Select.Popover>
        </Select>
        <Button aria-label="画面を再読み込みする" isIconOnly size="sm" variant="ghost" onPress={() => {
          const frame = document.querySelector<HTMLIFrameElement>(".play-frame");
          if (frame) frame.src = frameSrc;
        }}>
          <RotateCcw size={16} />
        </Button>
      </section>

      <div className="play-frame-wrap">
        <iframe className="play-frame" src={frameSrc} title={current.title} />
      </div>
    </main>
  );
}
