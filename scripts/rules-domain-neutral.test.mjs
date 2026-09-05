import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { publicDesignResourceText } from "./design-catalog.mjs";
import { rootDir } from "./lib.mjs";

// design/rules.json は実験を跨いで共有する設計ルール集。
// account-management 固有の語彙（顧客・会社名・Customer型名・/customers）が本文に残っていると、
// invoice-management など別題材の実験でルール文が嘘になる。
//
// 語彙を落としても harness 側の情報量が減らないことが前提なので、
// 読み取りモデル名が example の公開本文（composition）に残っていることも同時に固定する。
// composition から消すと harness agent への唯一の伝達経路が切れるため、
// このテストがその経路の見張りになる。

const domainVocabulary = /顧客|会社名|Customer|customers/;

/** @type {{ rules: { id: string, title: string, description: string, fix?: string }[] }} */
let rulesDocument;

beforeAll(async () => {
  rulesDocument = JSON.parse(await readFile(resolve(rootDir, "design", "rules.json"), "utf8"));
});

describe("design/rules.jsonの題材非依存性", () => {
  it("ruleの件数と id 集合は変えない", () => {
    expect(rulesDocument.rules).toHaveLength(28);
    expect(new Set(rulesDocument.rules.map((rule) => rule.id)).size).toBe(28);
  });

  it("title、description、fix に account-management 固有の語彙を残さない", () => {
    const violations = rulesDocument.rules
      .filter((rule) => domainVocabulary.test([rule.title, rule.description, rule.fix ?? ""].join("\n")))
      .map((rule) => rule.id);
    expect(violations).toEqual([]);
  });
});

describe("読み取りモデル名の伝達経路", () => {
  it("exampleの公開本文にCustomerSummaryとCustomerDetailが残る", async () => {
    const path = "design/examples/account-management.json";
    const raw = await readFile(resolve(rootDir, path), "utf8");
    const publicText = publicDesignResourceText(path, raw);
    expect(publicText).toContain("CustomerSummary");
    expect(publicText).toContain("CustomerDetail");
  });
});

describe("評価器の題材非依存性", () => {
  it("evaluate-experiment.mjsの本文にaccount-management固有の語彙を残さない", async () => {
    const source = await readFile(resolve(rootDir, "scripts", "evaluate-experiment.mjs"), "utf8");
    const violations = source
      .split("\n")
      .map((line, index) => ({ line: index + 1, text: line }))
      .filter((entry) => domainVocabulary.test(entry.text))
      .map((entry) => `${entry.line}: ${entry.text.trim()}`);
    expect(violations).toEqual([]);
  });
});

describe("評価の証跡が参照する題材語彙の在り処", () => {
  it("必須入力の呼び名はexampleのevaluationが持つ", async () => {
    const example = JSON.parse(await readFile(resolve(rootDir, "design", "examples", "account-management.json"), "utf8"));
    expect(example.evaluation.requiredFieldLabel).toBe("顧客名");
  });
});
