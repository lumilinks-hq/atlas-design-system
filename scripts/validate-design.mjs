import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rootDir, walk } from "./lib.mjs";
import { renderTheme } from "./theme.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const designDir = resolve(rootDir, "design");
const validators = new Map();

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function validate(schemaName, value, label) {
  let validateValue = validators.get(schemaName);
  if (!validateValue) {
    const schema = await json(resolve(designDir, "schemas", schemaName));
    validateValue = ajv.compile(schema);
    validators.set(schemaName, validateValue);
  }
  if (!validateValue(value)) {
    throw new Error(`${label}: ${ajv.errorsText(validateValue.errors, { separator: "\n" })}`);
  }
}

const tokens = await json(resolve(designDir, "tokens.json"));
const rulesDocument = await json(resolve(designDir, "rules.json"));
const componentFiles = (await walk(resolve(designDir, "components"))).filter((path) => path.endsWith(".json"));
const patternFiles = (await walk(resolve(designDir, "patterns"))).filter((path) => path.endsWith(".json"));
const exampleFiles = (await walk(resolve(designDir, "examples"))).filter((path) => path.endsWith(".json"));
const components = await Promise.all(componentFiles.map(json));
const patterns = await Promise.all(patternFiles.map(json));
const examples = await Promise.all(exampleFiles.map(json));

await validate("tokens.schema.json", tokens, "tokens.json");
await validate("rules.schema.json", rulesDocument, "rules.json");
for (const [index, component] of components.entries()) {
  await validate("component.schema.json", component, basename(componentFiles[index]));
}
for (const [index, pattern] of patterns.entries()) {
  await validate("pattern.schema.json", pattern, basename(patternFiles[index]));
}
for (const [index, example] of examples.entries()) {
  await validate("example.schema.json", example, basename(exampleFiles[index]));
}

const ruleIds = new Set(rulesDocument.rules.map((rule) => rule.id));
const componentIds = new Set(components.map((component) => component.id));
const patternIds = new Set(patterns.map((pattern) => pattern.id));
if (ruleIds.size !== rulesDocument.rules.length) throw new Error("rules.json: rule IDが重複しています");
if (componentIds.size !== components.length) throw new Error("design/components: component IDが重複しています");
if (patternIds.size !== patterns.length) throw new Error("design/patterns: pattern IDが重複しています");

const tableComponent = components.find((component) => component.id === "component.table");
const radiusTokenIds = new Set(Object.keys(tokens.radius).map((name) => `radius.${name}`));

const layoutCss = await readFile(resolve(designDir, "layout.css"), "utf8");
const narrowBoundary = Number.parseInt(tokens.breakpoint.narrow, 10) - 1;
for (const match of layoutCss.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)) {
  if (Number(match[1]) !== narrowBoundary) {
    throw new Error(`design/layout.css: @media max-width ${match[1]}px が breakpoint.narrow(${tokens.breakpoint.narrow}) − 1px と一致しません`);
  }
}

const tokenRoots = new Set(Object.keys(tokens));

function isTokenReference(value) {
  const root = value.split(".")[0];
  return value.includes(".") && tokenRoots.has(root);
}

function resolveTokenReference(reference) {
  let current = tokens;
  for (const segment of reference.split(".")) {
    if (current === null || typeof current !== "object" || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

function assertLayoutValues(ownerId, values) {
  for (const [key, value] of Object.entries(values)) {
    if (isTokenReference(value) && resolveTokenReference(value) === undefined) {
      throw new Error(`${ownerId}: layout値 ${key} が存在しないtoken ${value} を参照しています`);
    }
  }
}

function assertLayoutClasses(ownerId, classes) {
  for (const className of classes) {
    const selectorPattern = new RegExp(`${className.replace(/[.\\]/g, "\\$&")}(?![\\w-])`);
    if (!selectorPattern.test(layoutCss)) {
      throw new Error(`${ownerId}: layout.classes の ${className} がdesign/layout.cssに定義されていません`);
    }
  }
}

for (const component of components) {
  if (!component.variants.includes(component.defaults.variant)) {
    throw new Error(`${component.id}: defaults.variant ${component.defaults.variant} がvariantsに含まれていません`);
  }
  if (!component.sizes.includes(component.defaults.size)) {
    throw new Error(`${component.id}: defaults.size ${component.defaults.size} がsizesに含まれていません`);
  }
  if (!radiusTokenIds.has(component.visual.radiusToken)) {
    throw new Error(`${component.id}: 存在しないradius token ${component.visual.radiusToken} を参照しています`);
  }
  for (const ruleId of component.relatedRules) {
    if (!ruleIds.has(ruleId)) throw new Error(`${component.id}: 存在しないrule ${ruleId} を参照しています`);
  }
  if (component.layout) assertLayoutValues(component.id, component.layout);
}

for (const pattern of patterns) {
  const variantIds = new Set(pattern.variants.map((variant) => variant.id));
  if (variantIds.size !== pattern.variants.length) throw new Error(`${pattern.id}: variant IDが重複しています`);
  for (const componentId of pattern.components) {
    if (!componentIds.has(componentId)) throw new Error(`${pattern.id}: 存在しないcomponent ${componentId} を参照しています`);
  }
  for (const ruleId of pattern.rules) {
    if (!ruleIds.has(ruleId)) throw new Error(`${pattern.id}: 存在しないrule ${ruleId} を参照しています`);
  }
  for (const variant of pattern.variants) {
    if (!variant.layout) continue;
    const ownerId = `${pattern.id}#${variant.id}`;
    if (variant.layout.breakpoint && resolveTokenReference(variant.layout.breakpoint) === undefined) {
      throw new Error(`${ownerId}: layout.breakpoint が存在しないtoken ${variant.layout.breakpoint} を参照しています`);
    }
    if (variant.layout.classes) assertLayoutClasses(ownerId, variant.layout.classes);
    assertLayoutValues(ownerId, variant.layout.values);
  }
}

for (const example of examples) {
  const pattern = patterns.find((candidate) => candidate.id === example.pattern);
  if (!pattern) throw new Error(`${example.id}: 存在しないpattern ${example.pattern} を参照しています`);
  if (!pattern.variants.some((variant) => variant.id === example.variant)) {
    throw new Error(`${example.id}: ${example.pattern}にvariant ${example.variant}が存在しません`);
  }
  for (const componentId of example.components) {
    if (!componentIds.has(componentId)) throw new Error(`${example.id}: 存在しないcomponent ${componentId} を参照しています`);
  }
  const tableUsage = example.componentUsage?.["component.table"];
  if (tableUsage) {
    if (!tableComponent?.variants.includes(tableUsage.variant)) {
      throw new Error(`${example.id}: component.table variant ${tableUsage.variant} は許可されていません`);
    }
    const columnIds = tableUsage.columns.map((column) => column.id);
    if (new Set(columnIds).size !== columnIds.length) {
      throw new Error(`${example.id}: component.tableの列IDが重複しています`);
    }
    if (tableUsage.columns.filter((column) => column.isRowHeader).length !== 1) {
      throw new Error(`${example.id}: component.tableはrow headerを1列だけ持つ必要があります`);
    }
    for (const column of tableUsage.columns.filter((item) => item.tabular)) {
      if (column.align !== "end") {
        throw new Error(`${example.id}: tabular列 ${column.id} は末尾揃えにしてください`);
      }
    }
  }
  for (const ruleId of example.rules) {
    if (!ruleIds.has(ruleId)) throw new Error(`${example.id}: 存在しないrule ${ruleId} を参照しています`);
  }
}

const generatedTheme = await readFile(resolve(rootDir, "src", "generated", "theme.css"), "utf8");
if (generatedTheme !== renderTheme(tokens)) throw new Error("src/generated/theme.cssがtokens.jsonと一致しません。pnpm theme:generateを実行してください");
const designTheme = await readFile(resolve(rootDir, "design", "theme.css"), "utf8");
if (designTheme !== renderTheme(tokens)) throw new Error("design/theme.cssがtokens.jsonと一致しません。pnpm theme:generateを実行してください");

export const designValidationSummary = {
  components: components.length,
  patterns: patterns.length,
  examples: examples.length,
  rules: ruleIds.size,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Design contract OK: ${components.length} components, ${patterns.length} pattern, ${examples.length} example, ${ruleIds.size} rules`);
}
