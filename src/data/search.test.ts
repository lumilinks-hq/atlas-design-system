import { describe, expect, it } from "vitest";
import { searchDocs } from "./search";

describe("searchDocs", () => {
  it("returns nothing for an empty query", () => {
    expect(searchDocs("")).toEqual([]);
    expect(searchDocs("   ")).toEqual([]);
  });

  it("finds components by name, case-insensitively", () => {
    const hits = searchDocs("BUTTON");
    const button = hits.find((hit) => hit.href === "/components#component.button");
    expect(button).toBeDefined();
    expect(button?.kind).toBe("コンポーネント");
    expect(button?.title).toBe("Button");
  });

  it("links rules and token groups with the hash convention", () => {
    expect(searchDocs("component.approved")[0]?.href).toBe("/rules#component.approved");
    const hits = searchDocs("color");
    expect(hits.some((hit) => hit.href === "/foundations#color")).toBe(true);
  });

  it("indexes static pages, patterns and examples", () => {
    expect(searchDocs("はじめに").some((hit) => hit.href === "/getting-started")).toBe(true);
    expect(searchDocs("page layout").some((hit) => hit.href === "/patterns/page-layout")).toBe(true);
    expect(searchDocs("顧客管理").some((hit) => hit.href === "/examples/account-management")).toBe(true);
  });

  it("treats whitespace-separated terms as AND", () => {
    const hits = searchDocs("page layout");
    expect(hits.every((hit) => /page/i.test(hit.title + hit.description + hit.href))).toBe(true);
    expect(searchDocs("button zzzz-no-such-term")).toEqual([]);
  });
});

it("サイドバーと同じ表記で静的ページが見つかり、コンポーネントの説明は id ではなく用途になる", () => {
  expect(searchDocs("検証ルール").map((h) => h.href)).toContain("/rules");
  expect(searchDocs("デザイントークン").map((h) => h.href)).toContain("/foundations");
  expect(searchDocs("導入方法").map((h) => h.href)).toContain("/getting-started");
  const button = searchDocs("button").find((h) => h.href === "/components#component.button");
  expect(button?.description).not.toBe("component.button");
  expect(button?.description).toContain("保存、検索、削除");
});
