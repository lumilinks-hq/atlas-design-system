import { Button, Chip } from "@heroui/react";
import { ArrowLeft, Presentation, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type PlayMode = "atlas" | "baseline";

const modes: Record<PlayMode, { button: string; title: string; description: string; src: string }> = {
  atlas: {
    button: "Atlas適用後",
    title: "Atlas適用後の顧客企業管理画面",
    description: "ページ構造、コンポーネント、状態、検証ルールを参照して生成した画面です。",
    src: "/play-atlas.html",
  },
  baseline: {
    button: "設計指示なし",
    title: "設計指示なしの顧客企業管理画面",
    description: "同じIssueだけをAIへ渡し、Atlasの設計情報を使わずに生成した画面です。",
    src: "/play-baseline.html",
  },
};

export function PlayPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const mode: PlayMode = requestedMode === "baseline" ? "baseline" : "atlas";
  const current = modes[mode];

  useEffect(() => {
    document.title = "生成された画面を操作する — Atlas Design System";
  }, []);

  const selectMode = (nextMode: PlayMode) => {
    setSearchParams({ mode: nextMode });
  };

  return (
    <main className="play-shell">
      <header className="play-header">
        <Button aria-label="利用例へ戻る" isIconOnly size="sm" variant="ghost" onPress={() => navigate("/examples/account-management")}>
          <ArrowLeft size={18} />
        </Button>
        <div className="play-title">
          <span>Atlas Design System</span>
          <h1>生成された画面を操作する</h1>
        </div>
        <Button size="sm" variant="secondary" onPress={() => navigate("/demo/runs/account-management")}>
          <Presentation size={16} /> 実装比較デモを見る
        </Button>
      </header>

      <section className="play-toolbar" aria-label="表示する実装を選ぶ">
        <div className="play-modes">
          {(Object.keys(modes) as PlayMode[]).map((item) => (
            <Button
              aria-pressed={mode === item}
              key={item}
              size="sm"
              variant={mode === item ? "primary" : "secondary"}
              onPress={() => selectMode(item)}
            >
              {modes[item].button}
            </Button>
          ))}
        </div>
        <div className="play-description" aria-live="polite">
          <Chip size="sm" variant="soft">{mode === "atlas" ? "Design Harnessあり" : "Design Harnessなし"}</Chip>
          <p>{current.description}</p>
        </div>
        <Button aria-label="画面を再読み込みする" isIconOnly size="sm" variant="ghost" onPress={() => {
          const frame = document.querySelector<HTMLIFrameElement>(".play-frame");
          if (frame) frame.src = current.src;
        }}>
          <RotateCcw size={16} />
        </Button>
      </section>

      <div className="play-frame-wrap">
        <iframe className="play-frame" src={current.src} title={current.title} />
      </div>
    </main>
  );
}
