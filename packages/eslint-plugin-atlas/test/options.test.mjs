import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAtlasLintOptions } from "../src/options.mjs";

// lint の判定語は example 契約が持つ。プラグインに実験固有の既定値を残さない
const rootDir = resolve(import.meta.dirname, "..", "..", "..");
const componentsDir = resolve(rootDir, "design", "components");
const accountExamplePath = resolve(rootDir, "design", "examples", "account-management.json");
const accountExample = JSON.parse(readFileSync(accountExamplePath, "utf8"));

const invoiceLinkSemantics = {
  objectNameExpression: "invoice.invoiceNumber",
  backLinkPattern: "請求書一覧(?:へ|に)戻る",
  mobileListClass: "collection-list-mobile",
  navigationTextPattern: "invoice\\.invoiceNumber|請求書を確認",
};

// 判定語以外の必須キーは各テストの関心外なので、明示しない限り請求書側の値で埋める
const invoiceLintDefaults = { requiredInputType: "date", irreversibleActionPattern: "無効化|voidInvoice" };

function optionsForLint(lint) {
  const example = { ...accountExample };
  if (lint === undefined) delete example.lint;
  else example.lint = { ...invoiceLintDefaults, ...lint };
  const path = resolve(mkdtempSync(resolve(tmpdir(), "atlas-options-")), "example.json");
  writeFileSync(path, `${JSON.stringify(example, null, 2)}\n`);
  return buildAtlasLintOptions({ componentsDir, examplePath: path });
}

describe("buildAtlasLintOptions", () => {
  it("forbiddenTextをexampleのlintから読む", () => {
    const options = optionsForLint({ forbiddenText: ["請求書を作成", "月次レポート"], linkSemantics: invoiceLinkSemantics });

    expect(options.forbiddenText).toEqual(["請求書を作成", "月次レポート"]);
  });

  it("forbiddenTextを持たないexampleでは空にする", () => {
    expect(optionsForLint({ linkSemantics: invoiceLinkSemantics }).forbiddenText).toEqual([]);
  });

  it("linkSemanticsをexampleのlintから読み、キーの並びを固定する", () => {
    const options = optionsForLint({
      linkSemantics: {
        navigationTextPattern: invoiceLinkSemantics.navigationTextPattern,
        mobileListClass: invoiceLinkSemantics.mobileListClass,
        backLinkPattern: invoiceLinkSemantics.backLinkPattern,
        objectNameExpression: invoiceLinkSemantics.objectNameExpression,
      },
    });

    expect(Object.keys(options.linkSemantics)).toEqual([
      "objectNameExpression",
      "backLinkPattern",
      "mobileListClass",
      "navigationTextPattern",
    ]);
    expect(options.linkSemantics).toEqual(invoiceLinkSemantics);
  });

  it("linkSemanticsを持たないexampleはthrowする", () => {
    expect(() => optionsForLint(undefined)).toThrow("lint.linkSemantics");
    expect(() => optionsForLint({ forbiddenText: [] })).toThrow("lint.linkSemantics");
  });

  it("objectNameExpressionとbackLinkPatternが欠けたらthrowする", () => {
    expect(() => optionsForLint({ linkSemantics: { backLinkPattern: "戻る" } })).toThrow("objectNameExpression");
    expect(() => optionsForLint({ linkSemantics: { objectNameExpression: "invoice.id" } })).toThrow("backLinkPattern");
  });

  it("requiredInputTypeとirreversibleActionPatternをexampleのlintから読む", () => {
    const options = optionsForLint({
      linkSemantics: invoiceLinkSemantics,
      requiredInputType: "date",
      irreversibleActionPattern: "無効化|voidInvoice",
    });

    expect(options.requiredInputType).toBe("date");
    expect(options.irreversibleActionPattern).toBe("無効化|voidInvoice");
  });

  it("requiredInputTypeとirreversibleActionPatternが欠けたらthrowする", () => {
    const base = { linkSemantics: invoiceLinkSemantics, ...invoiceLintDefaults };
    expect(() => optionsForLint({ ...base, requiredInputType: undefined })).toThrow("lint.requiredInputType");
    expect(() => optionsForLint({ ...base, irreversibleActionPattern: undefined })).toThrow("lint.irreversibleActionPattern");
  });

  it("顧客管理のexampleから現行と同じoptionsを組む", () => {
    const options = buildAtlasLintOptions({ componentsDir, examplePath: accountExamplePath });

    expect(options.forbiddenText).toEqual([
      "Atlas CRM",
      "ワークスペース",
      "契約管理",
      "料金管理",
      "利用人数",
      "権限管理",
    ]);
    expect(options.linkSemantics).toEqual({
      objectNameExpression: "customer.companyName",
      backLinkPattern: "顧客一覧(?:へ|に)戻る",
      mobileListClass: "collection-list-mobile",
      navigationTextPattern: "customer\\.companyName|顧客を確認|顧客一覧(?:へ|に)戻る",
    });
    expect(options.requiredInputType).toBe("email");
    expect(options.irreversibleActionPattern).toBe("削除|delete|remove");
  });
});
