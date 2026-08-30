import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rootDir, walk } from "./lib.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const schemaDir = resolve(rootDir, "design", "schemas");
const experimentSchema = JSON.parse(await readFile(resolve(schemaDir, "experiment.schema.json"), "utf8"));
const runSchema = JSON.parse(await readFile(resolve(schemaDir, "run.schema.json"), "utf8"));
const validateExperiment = ajv.compile(experimentSchema);
const validateRun = ajv.compile(runSchema);
const experimentsDir = resolve(rootDir, "experiments");
const files = await walk(experimentsDir);
const manifests = files.filter((path) => path.endsWith("manifest.json"));
const runs = files.filter((path) => path.includes("/runs/") && path.endsWith("run.json"));

for (const path of manifests) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateExperiment(value)) throw new Error(`${path}: ${ajv.errorsText(validateExperiment.errors)}`);
}

for (const path of runs) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateRun(value)) throw new Error(`${path}: ${ajv.errorsText(validateRun.errors)}`);
}

console.log(`Run data OK: ${manifests.length} experiment, ${runs.length} saved runs`);
