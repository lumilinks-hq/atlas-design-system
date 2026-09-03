import { getAttribute, getAttributeValue, getTagName } from "../jsx.mjs";

const nativeTags = new Set(["button", "table", "select", "input"]);

export default {
  meta: {
    type: "problem",
    docs: { description: "契約に存在しない UI 部品(独自 HTML、契約外の HeroUI import、Issue 対象外の文言)を検出する" },
    schema: [
      {
        type: "object",
        properties: {
          approvedImports: { type: "array", items: { type: "string" } },
          forbiddenText: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      native: "{{name}}: 独自 HTML 部品ではなく HeroUI の契約コンポーネントを使ってください",
      unapprovedImport: "契約にないHeroUI import: {{name}}",
      forbiddenText: "Issue対象外のUI（削除対象: {{text}}）",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const approvedImports = new Set(options.approvedImports ?? []);
    const forbiddenText = options.forbiddenText ?? [];
    const sourceCode = context.sourceCode;
    return {
      Program(node) {
        if (forbiddenText.length === 0) return;
        const pattern = new RegExp(forbiddenText.map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
        for (const match of sourceCode.text.matchAll(pattern)) {
          context.report({
            node,
            loc: { start: sourceCode.getLocFromIndex(match.index), end: sourceCode.getLocFromIndex(match.index + match[0].length) },
            messageId: "forbiddenText",
            data: { text: match[0] },
          });
        }
      },
      JSXOpeningElement(node) {
        const tagName = getTagName(node.name);
        if (nativeTags.has(tagName)) {
          context.report({ node, messageId: "native", data: { name: tagName } });
        }
        const role = getAttribute(node, "role");
        if (role && getAttributeValue(role) === "dialog") {
          context.report({ node: role, messageId: "native", data: { name: "custom dialog" } });
        }
      },
      ImportDeclaration(node) {
        if (node.source.value !== "@heroui/react" || node.importKind === "type") return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue;
          const imported = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;
          if (!approvedImports.has(imported)) {
            context.report({ node: specifier, messageId: "unapprovedImport", data: { name: imported } });
          }
        }
      },
    };
  },
};
