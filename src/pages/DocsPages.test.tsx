import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { contrastReport } from "../data/contrast";
import { designData } from "../data/design";
import { ComponentsPage, ExamplePage, FoundationsPage, RulesPage } from "./DocsPages";
import { ResultsPage } from "./HarnessPages";

afterEach(cleanup);

function renderPage(element: React.ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
}

describe("component JSON の記述項目", () => {
  it("全コンポーネントが用途・使わない場面・a11y・公式ドキュメントを持ち、1.1.0 に上がっている", () => {
    for (const component of designData.components) {
      expect(component.version, component.id).toBe("1.1.0");
      expect(component.usage.when.length, component.id).toBeGreaterThan(0);
      expect(component.usage.avoid.length, component.id).toBeGreaterThan(0);
      expect(component.accessibility.length, component.id).toBeGreaterThan(0);
      expect(component.docsUrl, component.id).toMatch(/^https:\/\/heroui\.com\/docs\/react\/components\/[a-z-]+$/);
    }
  });

  it("relatedRules は rules.json に存在するルールだけを参照する", () => {
    const ruleIds = new Set(designData.rules.map((rule) => rule.id));
    for (const component of designData.components) {
      for (const ruleId of component.relatedRules) expect(ruleIds.has(ruleId), `${component.id} -> ${ruleId}`).toBe(true);
    }
  });
});

describe("FoundationsPage", () => {
  it("トークングループごとの h2 アンカーを持つ", () => {
    const { container } = renderPage(<FoundationsPage />);
    for (const id of ["color", "space", "radius", "shadow", "content", "breakpoint", "type", "motion"]) {
      const heading = container.querySelector(`h2#${id}`);
      expect(heading, id).not.toBeNull();
    }
  });

  it("tokens.json の値をそのまま描画する", () => {
    renderPage(<FoundationsPage />);
    expect(screen.getByText(designData.tokens.color.text)).toBeInTheDocument();
    expect(screen.getByText(designData.tokens.breakpoint.narrow)).toBeInTheDocument();
    expect(screen.getByText(designData.tokens.content.maxWidth)).toBeInTheDocument();
    expect(screen.getAllByText(designData.tokens.space["4"]).length).toBeGreaterThan(0);
    expect(screen.getAllByText(designData.tokens.type.body).length).toBeGreaterThan(0);
  });

  it("各トークングループに用途と避ける使い方の説明がある", () => {
    const { container } = renderPage(<FoundationsPage />);
    for (const id of ["color", "space", "radius", "shadow", "content", "breakpoint", "type"]) {
      const section = container.querySelector(`h2#${id}`)?.closest("section");
      expect(section, id).not.toBeNull();
      expect(within(section as HTMLElement).getByText("用途")).toBeInTheDocument();
      expect(within(section as HTMLElement).getByText("避ける使い方")).toBeInTheDocument();
    }
  });

  it("コントラスト比の table を描画し、すべて AA を満たす", () => {
    renderPage(<FoundationsPage />);
    const table = screen.getByRole("table", { name: "コントラスト比" });
    const rows = within(table).getAllByRole("row").slice(1);
    const report = contrastReport(designData.tokens.color);
    expect(rows).toHaveLength(report.length);
    for (const row of rows) expect(within(row).getByText("AA")).toBeInTheDocument();
    const first = rows.find((row) => within(row).queryByText("text") && within(row).queryByText("background"));
    expect(first).toBeDefined();
  });

  it("motion 節で motion トークンを定義しないことと prefers-reduced-motion を明記する", () => {
    const { container } = renderPage(<FoundationsPage />);
    const section = container.querySelector("h2#motion")?.closest("section") as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.textContent).toContain("motion トークンを定義しない");
    expect(section.textContent).toContain("prefers-reduced-motion");
  });
});

describe("ComponentsPage", () => {
  it("コンポーネントごとに id アンカーと HeroUI 公式リンクを持つ", () => {
    const { container } = renderPage(<ComponentsPage />);
    for (const component of designData.components) {
      const heading = container.querySelector(`[id="${component.id}"]`);
      expect(heading, component.id).not.toBeNull();
      const entry = heading?.closest(".component-entry") as HTMLElement;
      const link = within(entry).getByRole("link", { name: /HeroUI 公式ドキュメント/ });
      expect(link).toHaveAttribute("href", component.docsUrl);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("用途・使わない場面・アクセシビリティ要件を JSON から描画する", () => {
    const { container } = renderPage(<ComponentsPage />);
    const button = designData.components.find((component) => component.id === "component.button")!;
    const entry = container.querySelector('[id="component.button"]')?.closest(".component-entry") as HTMLElement;
    expect(within(entry).getByText("用途")).toBeInTheDocument();
    expect(within(entry).getByText("使わない場面")).toBeInTheDocument();
    expect(within(entry).getByText("アクセシビリティ要件")).toBeInTheDocument();
    expect(within(entry).getByText(button.usage.when[0] ?? "")).toBeInTheDocument();
    expect(within(entry).getByText(button.usage.avoid[0] ?? "")).toBeInTheDocument();
    expect(within(entry).getByText(button.accessibility[0] ?? "")).toBeInTheDocument();
  });

  it("関連ルールは /rules#ルールID へのリンクになる", () => {
    const { container } = renderPage(<ComponentsPage />);
    const button = designData.components.find((component) => component.id === "component.button")!;
    const entry = container.querySelector('[id="component.button"]')?.closest(".component-entry") as HTMLElement;
    for (const ruleId of button.relatedRules) {
      const code = within(entry).getAllByText(ruleId, { selector: "code" });
      expect(code, ruleId).toHaveLength(1);
      expect(code[0]?.closest("a")).toHaveAttribute("href", `/rules#${ruleId}`);
    }
  });
});

describe("RulesPage", () => {
  it("ルールごとに id アンカーと修正方針を描画する", () => {
    const { container } = renderPage(<RulesPage />);
    for (const rule of designData.rules) {
      const row = container.querySelector(`[id="${rule.id}"]`)?.closest('[role="row"]') as HTMLElement;
      expect(row, rule.id).not.toBeNull();
      expect(within(row).getByText("修正方針")).toBeInTheDocument();
      expect(within(row).getByText(rule.fix)).toBeInTheDocument();
    }
  });

  it("関連コンポーネントを逆引きして /components#コンポーネントID へリンクする", () => {
    const { container } = renderPage(<RulesPage />);
    const ruleId = "component.approved";
    const related = designData.components.filter((component) => component.relatedRules.includes(ruleId));
    expect(related.length).toBeGreaterThan(0);
    const row = container.querySelector(`[id="${ruleId}"]`)?.closest('[role="row"]') as HTMLElement;
    for (const component of related) {
      expect(within(row).getByRole("link", { name: component.name })).toHaveAttribute("href", `/components#${component.id}`);
    }
  });
});

describe("ExamplePage", () => {
  it("この画面の業務制約を examples JSON から描画する", () => {
    renderPage(<ExamplePage slug="account-management" />);
    const example = designData.examples["account-management"];
    const section = screen.getByRole("region", { name: "この画面の業務制約" });
    expect(within(section).getByText(example.lint.forbiddenText.join(", "))).toBeInTheDocument();
    expect(within(section).getByText(example.evaluation.statusValues.join(", "))).toBeInTheDocument();
    expect(within(section).getByText(example.evaluation.toolbarAriaLabel)).toBeInTheDocument();
    expect(within(section).getByText(example.lint.requiredInputType)).toBeInTheDocument();
  });
});

describe("ResultsPage", () => {
  it("ルールごとの検査結果のルール名を /rules#ルールID へリンクする", () => {
    renderPage(<ResultsPage experiment="account-management" />, "/examples/account-management/results");
    const table = screen.getByRole("table", { name: "ルールごとの検査結果" });
    const rule = designData.rules[0]!;
    expect(within(table).getByRole("link", { name: rule.title })).toHaveAttribute("href", `/rules#${rule.id}`);
  });
});
