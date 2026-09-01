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

export function readAtlasResource(uri) {
  const resource = resourcesByUri.get(uri);
  if (!resource) throw new Error(`Unknown Atlas resource: ${uri}`);
  return {
    ...resource,
    text: readFileSync(resolve(rootDir, resource.path), "utf8"),
  };
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

export function resolveDesignContract({ patterns = [], examples = [] }) {
  if (patterns.length === 0 && examples.length === 0) throw new Error("At least one pattern or example reference is required");

  const selected = new Map();
  for (const id of ["design.quick-reference", "design.tokens", "design.rules", "design.theme", "design.component-theme", "design.layout"]) {
    const resource = resourcesById.get(id);
    selected.set(resource.uri, resource);
  }

  for (const ref of patterns) {
    const resource = resolvePatternRef(ref);
    selected.set(resource.uri, resource);
  }

  for (const ref of examples) {
    const resource = resolveExampleRef(ref);
    selected.set(resource.uri, resource);
    const example = readJson(resource.path);
    for (const componentId of example.components ?? []) {
      const component = resourcesById.get(componentId);
      if (!component) throw new Error(`Unknown component reference in ${ref}: ${componentId}`);
      selected.set(component.uri, component);
    }
  }

  return {
    version: "1.0.0",
    requested: { patterns, examples },
    resources: [...selected.values()].map(({ id, name, uri, path, mimeType }) => ({ id, name, uri, path, mimeType })),
  };
}

export function resolveManifest(manifestPath) {
  const absolutePath = resolve(rootDir, manifestPath);
  const relativePath = relative(rootDir, absolutePath);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") throw new Error("Manifest must be inside the Atlas repository");
  const manifest = JSON.parse(readFileSync(absolutePath, "utf8"));
  const contract = resolveDesignContract({
    patterns: manifest.designRefs?.patterns ?? [],
    examples: manifest.designRefs?.examples ?? [],
  });
  return {
    ...contract,
    agentSkills: resolveAgentSkills(manifest.conditions?.harness?.agentSkills ?? []),
  };
}
