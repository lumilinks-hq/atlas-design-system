import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import { buildAtlasLintOptions } from "../src/options.mjs";
import { atlasConfigs } from "../src/index.mjs";

// workspace の pnpm lint でも、画面を複数ファイルに分けた生成物の存在判定が誤検知しないことを確かめる
const rootDir = resolve(import.meta.dirname, "..", "..", "..");
const options = buildAtlasLintOptions({
  componentsDir: resolve(rootDir, "design", "components"),
  examplePath: resolve(rootDir, "design", "examples", "account-management.json"),
});

const page = `import { Button, Table } from "@heroui/react";
export function ListPage() {
  return (
    <Table.Root variant="primary">
      <Table.Content aria-label="顧客" />
      <Button variant="bogus">x</Button>
    </Table.Root>
  );
}
`;
const entry = `import { ListPage } from "./ListPage";
export function App() { return <ListPage />; }
`;

function lintWorkspace(files) {
  const workspace = mkdtempSync(resolve(tmpdir(), "atlas-screen-"));
  mkdirSync(resolve(workspace, "src"));
  for (const [name, text] of Object.entries(files)) writeFileSync(resolve(workspace, "src", name), text);
  const linter = new Linter({ cwd: workspace });
  const config = [
    { files: ["**/*.tsx"], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...atlasConfigs({ options, tsxFiles: ["src/**/*.tsx"], cssFiles: ["src/**/*.css"], screen: true }),
  ];
  return Object.fromEntries(
    Object.entries(files).map(([name, text]) => [
      name,
      // Linter API の既定は .js ブロックしか通さないので、ESLint CLI と同じく .tsx ブロックも通す
      linter.verify(text, config, { filename: resolve(workspace, "src", name), filterCodeBlock: () => true }).map((message) => message.ruleId),
    ]),
  );
}

describe("screen processor", () => {
  it("App.tsx の lint は import で辿れる画面全体で存在判定し、各ファイルのルールは重複させない", () => {
    const result = lintWorkspace({ "App.tsx": entry, "ListPage.tsx": page });
    // ListPage.tsx に Table.Root があるので App.tsx で table-variant は出ない
    expect(result["App.tsx"]).not.toContain("atlas/table-variant");
    // App.tsx 側では画面全体に対する存在判定だけが出る(variant 違反は ListPage.tsx のもの)
    expect(result["App.tsx"]).not.toContain("atlas/component-variants");
    expect(result["App.tsx"]).toContain("atlas/component-usage");
    expect(result["ListPage.tsx"]).toContain("atlas/component-variants");
    expect(result["ListPage.tsx"]).not.toContain("atlas/component-usage");
  });

  it("画面が App.tsx 1 ファイルなら従来と同じ判定になる", () => {
    const result = lintWorkspace({ "App.tsx": entry });
    expect(result["App.tsx"]).toContain("atlas/table-variant");
  });
});
