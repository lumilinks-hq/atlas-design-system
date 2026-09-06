import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { rootDir } from "./lib.mjs";
import { resolveAgentSkills } from "./skill-catalog.mjs";

const jsonDirectories = [
  { directory: "design/components", uriSegment: "components" },
  { directory: "design/patterns", uriSegment: "patterns" },
  { directory: "design/examples", uriSegment: "examples" },
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));
}

const generatedResources = jsonDirectories.flatMap(({ directory, uriSegment }) =>
  readdirSync(resolve(rootDir, directory))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const path = `${directory}/${file}`;
      const data = readJson(path);
      const slug = data.id.replace(/^[^.]+\./, "");
      return {
        id: data.id,
        name: data.name ?? data.id,
        uri: `atlas://design/${uriSegment}/${slug}`,
        path,
        mimeType: "application/json",
      };
    }),
);

export const atlasResources = [
  {
    id: "design.quick-reference",
    name: "Atlas quick reference",
    uri: "atlas://design/quick-reference",
    path: "DESIGN.md",
    mimeType: "text/markdown",
  },
  {
    id: "design.components-api",
    name: "HeroUI API sheet for approved components",
    uri: "atlas://design/components-api",
    path: "design/components-api.md",
    mimeType: "text/markdown",
  },
  {
    id: "design.tokens",
    name: "Atlas semantic tokens",
    uri: "atlas://design/tokens",
    path: "design/tokens.json",
    mimeType: "application/json",
  },
  {
    id: "design.rules",
    name: "Atlas validation rules",
    uri: "atlas://design/rules",
    path: "design/rules.json",
    mimeType: "application/json",
  },
  {
    id: "design.theme",
    name: "Atlas generated CSS theme",
    uri: "atlas://design/theme",
    path: "design/theme.css",
    mimeType: "text/css",
  },
  {
    id: "design.component-theme",
    name: "Atlas HeroUI theme adapter",
    uri: "atlas://design/component-theme",
    path: "design/component-theme.css",
    mimeType: "text/css",
  },
  {
    id: "design.layout",
    name: "Atlas layout partials",
    uri: "atlas://design/layout",
    path: "design/layout.css",
    mimeType: "text/css",
  },
  ...generatedResources,
];

const resourcesByUri = new Map(atlasResources.map((resource) => [resource.uri, resource]));
const resourcesById = new Map(atlasResources.map((resource) => [resource.id, resource]));

/**
 * lint で検査するルールを rules.json から除く。ESLint(eslint-plugin-atlas)が
 * 機械判定する分は AI に読ませず、違反は lint 出力として返す
 */
export function stripLintRules(rulesDocument) {
  return { ...rulesDocument, rules: rulesDocument.rules.filter((rule) => rule.method !== "lint") };
}

// example の evaluation は採点条件そのもの。agent へ渡すと harness だけが答えを見た比較になるため外す
export function stripEvaluationFields(example) {
  return Object.fromEntries(Object.entries(example).filter(([key]) => key !== "evaluation"));
}

export function readAtlasResource(uri) {
  const resource = resourcesByUri.get(uri);
  if (!resource) throw new Error(`Unknown Atlas resource: ${uri}`);
  const raw = readFileSync(resolve(rootDir, resource.path), "utf8");
  return { ...resource, text: publicResourceText(uri, resource.path, raw) };
}

// agent と MCP に見せる本文。design/rules.json と example から採点条件を外す
function publicResourceText(uri, path, raw) {
  if (uri === "atlas://design/rules" || path === "design/rules.json") {
    return `${JSON.stringify(stripLintRules(JSON.parse(raw)), null, 2)}\n`;
  }
  if (path.startsWith("design/examples/")) {
    return `${JSON.stringify(stripEvaluationFields(JSON.parse(raw)), null, 2)}\n`;
  }
  return raw;
}

export function publicDesignResourceText(path, raw) {
  return publicResourceText(undefined, path, raw);
}

function resolvePatternRef(ref) {
  const [id, variant] = ref.split("#");
  const resource = resourcesById.get(id);
  if (!resource || !resource.uri.includes("/patterns/")) throw new Error(`Unknown pattern reference: ${ref}`);
  if (variant) {
    const pattern = readJson(resource.path);
    if (!pattern.variants.some((item) => item.id === variant)) throw new Error(`Unknown pattern variant: ${ref}`);
  }
  return resource;
}

function resolveExampleRef(ref) {
  const resource = resourcesById.get(ref);
  if (!resource || !resource.uri.includes("/examples/")) throw new Error(`Unknown example reference: ${ref}`);
  return resource;
}

export function resolveDesignContract({ patterns = [], examples = [], screens = [] }) {
  if (patterns.length === 0 && examples.length === 0) throw new Error("At least one pattern or example reference is required");

  const selected = new Map();
  const patternVariants = new Map();
  for (const id of ["design.quick-reference", "design.components-api", "design.tokens", "design.rules", "design.theme", "design.component-theme", "design.layout"]) {
    const resource = resourcesById.get(id);
    selected.set(resource.uri, resource);
  }

  function selectPatternRef(ref) {
    const resource = resolvePatternRef(ref);
    selected.set(resource.uri, resource);
    const variant = ref.split("#")[1];
    if (!patternVariants.has(resource.id)) patternVariants.set(resource.id, new Set());
    if (variant) patternVariants.get(resource.id).add(variant);
    return resource;
  }

  for (const ref of patterns) {
    selectPatternRef(ref);
  }

  for (const ref of examples) {
    const resource = resolveExampleRef(ref);
    selected.set(resource.uri, resource);
    const example = readJson(resource.path);
    if (example.pattern) {
      selectPatternRef(example.variant ? `${example.pattern}#${example.variant}` : example.pattern);
    }
    for (const componentId of example.components ?? []) {
      const component = resourcesById.get(componentId);
      if (!component) throw new Error(`Unknown component reference in ${ref}: ${componentId}`);
      selected.set(component.uri, component);
    }
  }

  for (const screen of screens) {
    selectPatternRef(screen.pattern);
    for (const overlay of screen.overlays ?? []) {
      const component = resourcesById.get(overlay.component);
      if (!component || !component.uri.includes("/components/")) {
        throw new Error(`Unknown component reference in screen ${screen.id}: ${overlay.component}`);
      }
      selected.set(component.uri, component);
      selectPatternRef(overlay.pattern);
    }
  }

  return {
    version: "1.1.0",
    requested: { patterns, examples },
    screens,
    resources: [...selected.values()].map(({ id, name, uri, path, mimeType }) => ({
      id,
      name,
      uri,
      path,
      mimeType,
      ...(patternVariants.has(id) ? { variants: [...patternVariants.get(id)] } : {}),
    })),
  };
}

/**
 * 契約が要求した最初の example の resource を返す。
 * resources から /examples/ を拾うと実験が増えたとき別の example を掴むので、
 * manifest の designRefs.examples が指す id で引く。
 * @param {{ requested?: { examples?: string[] }, resources: { id: string }[] }} contract
 */
export function primaryExampleResource(contract) {
  const [exampleId] = contract.requested?.examples ?? [];
  if (!exampleId) throw new Error("契約にexampleがありません");
  const resource = contract.resources.find((item) => item.id === exampleId);
  if (!resource) throw new Error(`契約にexampleがありません: ${exampleId}`);
  return resource;
}

export function resolveManifest(manifestPath) {
  const absolutePath = resolve(rootDir, manifestPath);
  const relativePath = relative(rootDir, absolutePath);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") throw new Error("Manifest must be inside the Atlas repository");
  const manifest = JSON.parse(readFileSync(absolutePath, "utf8"));
  const contract = resolveDesignContract({
    patterns: manifest.designRefs?.patterns ?? [],
    examples: manifest.designRefs?.examples ?? [],
    screens: manifest.screens ?? [],
  });
  return {
    ...contract,
    agentSkills: resolveAgentSkills(manifest.conditions?.harness?.agentSkills ?? []),
  };
}
