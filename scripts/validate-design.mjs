import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
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

for (const component of components) {
  for (const ruleId of component.relatedRules) {
    if (!ruleIds.has(ruleId)) throw new Error(`${component.id}: 存在しないrule ${ruleId} を参照しています`);
  }
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
  for (const ruleId of example.rules) {
    if (!ruleIds.has(ruleId)) throw new Error(`${example.id}: 存在しないrule ${ruleId} を参照しています`);
  }
}

const generatedTheme = await readFile(resolve(rootDir, "src", "generated", "theme.css"), "utf8");
if (generatedTheme !== renderTheme(tokens)) throw new Error("src/generated/theme.cssがtokens.jsonと一致しません。pnpm theme:generateを実行してください");

console.log(`Design contract OK: ${components.length} components, ${patterns.length} pattern, ${examples.length} example, ${ruleIds.size} rules`);
