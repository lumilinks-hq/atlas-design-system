import { designData, examplesBySlug, patternsBySlug } from "./design";

export type SearchHit = { title: string; description: string; href: string; kind: string };

const staticPages: SearchHit[] = [
  { title: "デザインハーネス", description: "生成・検証・修正のサイクルと実験結果", href: "/harness", kind: "ページ" },
  { title: "導入方法", description: "Atlas Design System の使い始め方（はじめに）", href: "/getting-started", kind: "ページ" },
  { title: "技術仕様", description: "実装スタックと配布物の仕様", href: "/technical-specifications", kind: "ページ" },
  { title: "デザイントークン", description: "色・余白・幅・角丸・影・文字のトークン（基礎）", href: "/foundations", kind: "ページ" },
  { title: "コンポーネント", description: "利用できるコンポーネント一覧", href: "/components", kind: "ページ" },
  { title: "検証ルール", description: "検証で使うデザインルール一覧", href: "/rules", kind: "ページ" },
  ...Object.entries(patternsBySlug).map(([slug, pattern]) => ({
    title: pattern.name,
    description: pattern.purpose,
    href: `/patterns/${slug}`,
    kind: "パターン",
  })),
  ...Object.entries(examplesBySlug).map(([slug, example]) => ({
    title: example.name,
    description: example.purpose,
    href: `/examples/${slug}`,
    kind: "サンプル",
  })),
];

const tokenGroups: Record<string, string> = {
  color: "色",
  space: "余白",
  radius: "角丸",
  shadow: "影",
  content: "幅",
  breakpoint: "ブレークポイント",
  type: "文字",
};

function tokenHits(): SearchHit[] {
  const tokens = designData.tokens as Record<string, unknown>;
  return Object.entries(tokenGroups).map(([group, label]) => {
    const values = tokens[group];
    const names = values && typeof values === "object" ? Object.keys(values).join(", ") : "";
    return { title: label, description: `${group}: ${names}`, href: `/foundations#${group}`, kind: "トークン" };
  });
}

function componentHits(): SearchHit[] {
  return designData.components.map((component) => {
    const c = component as { id: string; name: string; usage?: { when?: string[] } };
    return {
      title: c.name,
      description: c.usage?.when?.[0] ?? c.id,
      href: `/components#${c.id}`,
      kind: "コンポーネント",
    };
  });
}

function ruleHits(): SearchHit[] {
  return designData.rules.map((rule) => ({
    title: rule.title,
    description: `${rule.id} — ${rule.description}`,
    href: `/rules#${rule.id}`,
    kind: "ルール",
  }));
}

export const searchIndex: SearchHit[] = [...staticPages, ...tokenHits(), ...componentHits(), ...ruleHits()];

export function searchDocs(query: string): SearchHit[] {
  const terms = query.toLowerCase().split(/[\s\u3000]+/).filter(Boolean);
  if (terms.length === 0) return [];
  return searchIndex.filter((hit) => {
    const haystack = `${hit.title} ${hit.description} ${hit.href}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
