// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import * as heroUi from "@heroui/react";
import { rules as atlasRules } from "../packages/eslint-plugin-atlas/src/index.mjs";
import {
  buildComponentsApiMarkdown,
  componentApiSpecs,
  componentsApiRelativePath,
  heroUiTypeCorpus,
  readApprovedComponents,
} from "./build-components-api.mjs";
import { resolveManifest } from "./design-catalog.mjs";
import { rootDir } from "./lib.mjs";

const committed = readFileSync(resolve(rootDir, componentsApiRelativePath), "utf8");

describe("components API sheet", () => {
  it("生成結果が commit 済みファイルと一致する(stale でない)", () => {
    expect(committed).toBe(buildComponentsApiMarkdown());
  });

  it("承認済みコンポーネントを全部載せる", () => {
    const approved = readApprovedComponents();
    expect(approved.length).toBeGreaterThan(0);
    for (const component of approved) {
      expect(Object.keys(componentApiSpecs)).toContain(component.id);
      expect(committed).toContain(`## ${component.name}`);
    }
    expect(Object.keys(componentApiSpecs)).toHaveLength(approved.length);
  });

  it("1コンポーネントあたり30行以内に収める", () => {
    const sections = committed.split(/^## /m).slice(1);
    for (const section of sections) {
      const lines = section.trimEnd().split("\n");
      expect({ name: lines[0], lines: lines.length }).toMatchObject({ lines: expect.any(Number) });
      expect(lines.length).toBeLessThanOrEqual(30);
    }
  });

  it("シートが挙げる prop はすべて解決済みの型定義に実在する", () => {
    const corpus = heroUiTypeCorpus();
    for (const [id, spec] of Object.entries(componentApiSpecs)) {
      for (const [name] of spec.props) {
        const bare = name.replace(/\?$/, "");
        expect({ id, prop: bare, found: corpus.includes(bare) }).toEqual({ id, prop: bare, found: true });
      }
    }
  });

  it("Atlas の variants が HeroUI の union と食い違ったら生成が失敗する", () => {
    expect(() => buildComponentsApiMarkdown({ overrides: { "component.button": { variants: ["neon"] } } }))
      .toThrow(/neon/);
  });

  it("harness の resolved resource に含まれ baseline には現れない", () => {
    const resolved = resolveManifest("experiments/account-management/manifest.json");
    const paths = resolved.resources.map((resource) => resource.path);
    expect(paths).toContain(componentsApiRelativePath);
    expect(resolved.resources.find((resource) => resource.path === componentsApiRelativePath).id)
      .toBe("design.components-api");
  });

  it("DESIGN.md が node_modules 探索ではなくこのシートを見るよう指示する", () => {
    const design = readFileSync(resolve(rootDir, "DESIGN.md"), "utf8");
    expect(design).toContain(componentsApiRelativePath);
    expect(design).toContain("node_modules");
  });
});

/** 生成済み Markdown を「## 見出し」単位に割り、下位一覧と tsx 例を取り出す */
function readSections(markdown) {
  const sections = new Map();
  for (const block of markdown.split(/^## /m).slice(1)) {
    const name = block.split("\n", 1)[0];
    const subLine = block.match(/^- 下位: (.*)$/m)?.[1] ?? "";
    sections.set(name, {
      subComponents: new Set([...subLine.matchAll(/`[A-Za-z]+\.([A-Za-z]+)`/g)].map((match) => match[1])),
      examples: [...block.matchAll(/```tsx\n([\s\S]*?)```/g)].map((match) => match[1]),
    });
  }
  return sections;
}

describe("例が実在するタグだけを使う", () => {
  const sections = readSections(committed);
  // 例に出る X.Y の X は実装名。Alert の例が Alert.Title を使うように節をまたぐので全節ぶん集める
  const subComponentsByOwner = new Map([...sections].map(([name, section]) => [name, section.subComponents]));
  const heroUiExports = new Set(Object.keys(heroUi));
  const tags = [];
  for (const [name, section] of sections) {
    for (const example of section.examples) {
      for (const match of example.matchAll(/<([A-Z][A-Za-z]*)(?:\.([A-Za-z]+))?[\s/>]/g)) {
        tags.push({ section: name, owner: match[1], sub: match[2] });
      }
    }
  }

  it("例のタグを1つ以上拾えている(正規表現が壊れていない)", () => {
    expect(tags.length).toBeGreaterThan(40);
  });

  it("X.Y 形式のタグは X の下位一覧に載っている", () => {
    const unknown = tags
      .filter((tag) => tag.sub !== undefined)
      .filter((tag) => !subComponentsByOwner.get(tag.owner)?.has(tag.sub))
      .map((tag) => `${tag.section}: <${tag.owner}.${tag.sub}>`);
    expect(unknown).toEqual([]);
  });

  it("単独タグは @heroui/react の named export である", () => {
    const unknown = tags
      .filter((tag) => tag.sub === undefined && !heroUiExports.has(tag.owner))
      .map((tag) => `${tag.section}: <${tag.owner}>`);
    expect(unknown).toEqual([]);
  });

  it("例の import 文が挙げる名前は実在する export である", () => {
    const names = [...committed.matchAll(/^import \{ ([^}]+) \} from "@heroui\/react";$/gm)]
      .flatMap((match) => match[1].split(",").map((name) => name.trim()));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !heroUiExports.has(name))).toEqual([]);
  });
});

describe("例そのものが契約ルールを通る", () => {
  // シートが教える形が lint に叱られるようでは、真似した agent の turn を増やすだけになる
  const grab = (name) => committed.split(`\n## ${name}\n`)[1].split("\n## ")[0].match(/```tsx\n([\s\S]*?)```/)[1].trimEnd();
  const screen = `export function Screen() {
  return (
    <>
${grab("Drawer")}
${grab("AlertDialog")}
${grab("Table")}
    </>
  );
}
`;
  const lint = (source) =>
    new Linter().verify(
      source,
      {
        files: ["**/*.tsx"],
        languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" } },
        plugins: { atlas: { rules: atlasRules } },
        rules: {
          "atlas/focus-management": "error",
          "atlas/action-confirmation": ["error", { pattern: "削除" }],
          "atlas/link-semantics": ["error", { objectNameExpression: "customer.companyName" }],
        },
      },
      "src/Screen.tsx",
    );

  it("Drawer/AlertDialog/Table の例に契約ルール違反がない", () => {
    expect(lint(screen).map((message) => `${message.ruleId}: ${message.message}`)).toEqual([]);
  });

  it("Drawer.Trigger を落とした形なら違反として検出できる(検査が空振りしていない)", () => {
    const broken = screen.replace(/^ *<Drawer\.Trigger[^\n]*\n/m, "");
    expect(broken).not.toBe(screen);
    expect(lint(broken).length).toBeGreaterThan(0);
  });
});

/**
 * 例に書かれた variant / size の値が Atlas の承認値かを検べる。
 * Atlas の variant が HeroUI のどの prop・どのタグに載るかは componentApiSpecs が持つ。
 * 例の1行に複数タグが並ぶので、属性の直前にあるタグを持ち主とみなす。
 * @param {string} markdown
 * @param {ReturnType<typeof readApprovedComponents>} components
 */
function collectStyleValueViolations(markdown, components) {
  const byName = new Map(components.map((component) => [component.name, component]));
  const violations = [];
  for (const [sectionName, section] of readSections(markdown)) {
    for (const example of section.examples) {
      for (const line of example.split("\n")) {
        for (const attribute of line.matchAll(/\b(variant|size|status)="([^"]*)"/g)) {
          let tag = null;
          for (const opening of line.matchAll(/<([A-Z][A-Za-z]*)(?:\.([A-Za-z]+))?/g)) {
            if (opening.index < attribute.index) tag = { owner: opening[1], full: opening[2] ? `${opening[1]}.${opening[2]}` : opening[1] };
          }
          const component = tag && byName.get(tag.owner);
          if (!component) continue;
          const spec = componentApiSpecs[component.id];
          const [, name, value] = attribute;
          const at = `${sectionName}: <${tag.full} ${name}="${value}">`;
          const carriesVariant = spec.variant.mode !== "none" && spec.variant.mode !== "boolean" && spec.variant.prop === name;
          if (carriesVariant) {
            if (spec.variant.on && tag.full !== spec.variant.on) violations.push(`${at} は ${spec.variant.on} に付ける`);
            else if (!component.variants.includes(value)) violations.push(`${at} は承認済み variants(${component.variants.join("|")})に無い`);
            continue;
          }
          if (name === "variant") violations.push(`${at} この部品に variant prop は無い`);
          if (name !== "size") continue;
          if (spec.size.mode !== "union") violations.push(`${at} この部品に size prop は無い`);
          else if (spec.size.on && tag.full !== spec.size.on) violations.push(`${at} は ${spec.size.on} に付ける`);
          else if (!component.sizes.includes(value)) violations.push(`${at} は承認済み sizes(${component.sizes.join("|")})に無い`);
        }
      }
    }
  }
  return violations;
}

describe("例の variant / size が承認値だけを使う", () => {
  const components = readApprovedComponents();

  it("例に variant か size を1つ以上拾えている(正規表現が壊れていない)", () => {
    const found = [...committed.matchAll(/\b(?:variant|size|status)="/g)];
    expect(found.length).toBeGreaterThan(8);
  });

  it("承認済みの値だけを使い、載せる先のタグも合っている", () => {
    expect(collectStyleValueViolations(committed, components)).toEqual([]);
  });

  it("未承認の値や誤ったタグを検出できる(検査が空振りしていない)", () => {
    const bad = [
      "## Button\n- 下位: なし\n\n```tsx\n<Button variant=\"neon\" size=\"xxl\">保存</Button>\n```\n",
      "## AlertDialog\n- 下位: `AlertDialog.Container`\n\n```tsx\n<AlertDialog variant=\"blur\"><AlertDialog.Container size=\"cover\" /></AlertDialog>\n```\n",
      "## Table\n- 下位: なし\n\n```tsx\n<Table variant=\"primary\" size=\"md\" />\n```\n",
    ].join("\n");
    const violations = collectStyleValueViolations(bad, components);
    expect(violations).toHaveLength(4);
    expect(violations.join("\n")).toMatch(/neon/);
    expect(violations.join("\n")).toMatch(/xxl/);
    expect(violations.join("\n")).toMatch(/AlertDialog\.Backdrop に付ける/);
    expect(violations.join("\n")).toMatch(/Table.*size.*prop は無い/);
  });
});

describe("lint が実際に落ちた形を注意書きに残す", () => {
  // fast-01 の harness run は Cell の中身を renderCustomerCell へ切り出したため
  // atlas/link-semantics が Link を見つけられず、原因調査に6手かかった
  it("Table の Link は Cell へ直接書くと明記する", () => {
    const table = committed.split(/^## /m).find((section) => section.startsWith("Table\n"));
    expect(table).toMatch(/別関数/);
    expect(table).toMatch(/直接/);
  });
});
