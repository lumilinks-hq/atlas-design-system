import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// variant を検査する JSX タグと契約 slug の対応。契約側に tag 名の情報が無いためここで持つ
export const variantTagMap = {
  Button: "button",
  Card: "card",
  "Card.Root": "card",
  Chip: "chip",
  Select: "select",
  "Select.Root": "select",
  Input: "text-field",
  Link: "link",
  SearchField: "search-field",
  Surface: "surface",
  "Table.Root": "table",
  Toolbar: "toolbar",
  "Drawer.Backdrop": "drawer",
  "AlertDialog.Backdrop": "alert-dialog",
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// linkSemantics の語は実験ごとに変わるので example が持つ。
// キーの並びは HARNESS_LINT.json の差分を安定させるため固定する
const linkSemanticsKeys = ["objectNameExpression", "backLinkPattern", "mobileListClass", "navigationTextPattern"];

// lint の判定語は example が持つ。既定値をプラグインに置くと、
// 指定を忘れた実験が別題材の条件で黙って採点される
function requireLintString(example, examplePath, key) {
  const value = example.lint?.[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${examplePath}: lint.${key} がありません`);
  return value;
}

function buildLinkSemantics(example, examplePath) {
  const source = example.lint?.linkSemantics;
  if (!source) throw new Error(`${examplePath}: lint.linkSemantics がありません`);
  for (const key of ["objectNameExpression", "backLinkPattern"]) {
    if (!source[key]) throw new Error(`${examplePath}: lint.linkSemantics.${key} がありません`);
  }
  return Object.fromEntries(
    linkSemanticsKeys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]),
  );
}

/**
 * design/components と example から、ルールへ渡す options を組む。
 * 評価器と生成 workspace の両方が同じ関数を通るので、判定条件は 1 か所に集まる。
 * 戻り値は JSON 化できる(HARNESS_LINT.json として workspace へ書く)
 */
export function buildAtlasLintOptions({ componentsDir, examplePath }) {
  const contracts = new Map(
    readdirSync(componentsDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const contract = readJson(resolve(componentsDir, file));
        return [contract.id, { slug: file.slice(0, -".json".length), ...contract }];
      }),
  );
  const example = readJson(examplePath);
  const linkSemantics = buildLinkSemantics(example, examplePath);
  const requiredInputType = requireLintString(example, examplePath, "requiredInputType");
  const irreversibleActionPattern = requireLintString(example, examplePath, "irreversibleActionPattern");
  const exampleContracts = example.components.map((componentId) => {
    const contract = contracts.get(componentId);
    if (!contract) throw new Error(`${examplePath}: ${componentId} の契約が ${componentsDir} にありません`);
    return contract;
  });

  const approvedImports = [
    ...new Set(exampleContracts.flatMap((contract) => [contract.implementation, ...(contract.anatomy ?? [])])),
  ];
  const componentUsage = Object.keys(example.componentUsage).map((componentId) => {
    const contract = exampleContracts.find((item) => item.id === componentId);
    if (!contract) throw new Error(`${componentId}: componentUsage の契約が example の components にありません`);
    return { name: contract.name, implementation: contract.implementation };
  });
  const variants = Object.fromEntries(
    Object.entries(variantTagMap).map(([tagName, slug]) => {
      const contract = [...contracts.values()].find((item) => item.slug === slug);
      if (!contract) throw new Error(`variantTagMap: ${slug}.json が ${componentsDir} にありません`);
      return [tagName, { name: contract.name, variants: contract.variants ?? [] }];
    }),
  );
  const tableUsage = example.componentUsage["component.table"];

  return {
    approvedImports,
    forbiddenText: [...(example.lint?.forbiddenText ?? [])],
    componentUsage,
    variants,
    tableVariant: tableUsage?.variant ?? "primary",
    linkSemantics,
    requiredInputType,
    irreversibleActionPattern,
    componentThemeImport: "design/component-theme.css",
  };
}
