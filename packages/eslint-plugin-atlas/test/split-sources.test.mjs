import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { buildAtlasLintOptions } from "../src/options.mjs";
import { lintAtlasSources } from "../src/index.mjs";

// 画面を複数ファイルに分けた生成物でも、存在判定系ルールが誤検知しないことを確かめる
const rootDir = resolve(import.meta.dirname, "..", "..", "..");
const options = buildAtlasLintOptions({
  componentsDir: resolve(rootDir, "design", "components"),
  examplePath: resolve(rootDir, "design", "examples", "account-management.json"),
});

const page = `import { Table } from "@heroui/react";
export function ListPage() {
  return (
    <Table variant="primary">
      <Table.Content aria-label="顧客">
        <Table.Header><Table.Column isRowHeader>会社</Table.Column></Table.Header>
        <Table.Body><Table.Row><Table.Cell>a</Table.Cell></Table.Row></Table.Body>
      </Table.Content>
    </Table>
  );
}
`;
const entry = `import { ListPage } from "./ListPage";
export function App() { return <ListPage />; }
`;

describe("lintAtlasSources の複数ファイル入力", () => {
  it("tsxFiles を渡すと存在判定は連結した全体で行い、ファイル内ルールは各ファイル名で報告する", () => {
    const tsxFiles = [
      { filename: "src/App.tsx", text: entry },
      { filename: "src/ListPage.tsx", text: page },
    ];
    const lint = lintAtlasSources({ app: `${entry}\n${page}`, styles: "", options, tsxFiles });
    expect(lint.fatal).toEqual([]);
    // App.tsx 単体には Table が無いが、ListPage.tsx にあるので table-variant は違反しない
    expect(lint.messagesByRule.get("table-variant")).toEqual([]);
    // ファイル内ルールのメッセージには由来ファイル名が付く
    const badButton = `import { Button } from "@heroui/react";\nexport const B = () => <Button variant="bogus">x</Button>;\n`;
    const raw = lintAtlasSources({ app: badButton, styles: "", options, tsxFiles: [{ filename: "src/Page.tsx", text: badButton }] });
    const variants = raw.messagesByRule.get("component-variants");
    expect(variants.length).toBeGreaterThan(0);
    expect(variants[0].filename).toBe("src/Page.tsx");
  });

  it("tsxFiles を省略すると従来どおり app を App.tsx として lint する", () => {
    const lint = lintAtlasSources({ app: entry, styles: "", options });
    expect(lint.messagesByRule.get("table-variant").length).toBeGreaterThan(0);
  });
});
