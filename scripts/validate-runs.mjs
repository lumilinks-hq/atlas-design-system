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
const validateDecisions = ajv.compile(JSON.parse(await readFile(resolve(schemaDir, "decisions.schema.json"), "utf8")));
const validateJudgments = ajv.compile(JSON.parse(await readFile(resolve(schemaDir, "judgments.schema.json"), "utf8")));
const experimentsDir = resolve(rootDir, "experiments");
const files = await walk(experimentsDir);
const manifests = files.filter((path) => path.endsWith("manifest.json"));
const runs = files.filter((path) => path.includes("/runs/") && path.endsWith("run.json"));
// 人の判断（pnpm experiment:decide が書く）。保存済み Run にはまだない
const decisionFiles = files.filter((path) => path.includes("/runs/") && path.endsWith("/decisions.json"));
// モデルの判定（pnpm experiment:judge --write が書く）
const judgmentFiles = files.filter((path) => path.includes("/runs/") && path.endsWith("/judgments.json"));

for (const path of manifests) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateExperiment(value)) throw new Error(`${path}: ${ajv.errorsText(validateExperiment.errors)}`);
}

for (const path of runs) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateRun(value)) throw new Error(`${path}: ${ajv.errorsText(validateRun.errors)}`);
}

for (const path of decisionFiles) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateDecisions(value)) throw new Error(`${path}: ${ajv.errorsText(validateDecisions.errors)}`);
}

for (const path of judgmentFiles) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (!validateJudgments(value)) throw new Error(`${path}: ${ajv.errorsText(validateJudgments.errors)}`);
}

console.log(`Run data OK: ${manifests.length} experiment, ${runs.length} saved runs, ${decisionFiles.length} decision files, ${judgmentFiles.length} judgment files`);
