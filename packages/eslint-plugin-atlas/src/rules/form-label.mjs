import { getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "入力に視覚ラベルまたは aria-label を付ける" },
    schema: [],
    messages: { missing: "入力ラベルを確認できません" },
  },
  create(context) {
    let hasLabel = false;
    return {
      JSXOpeningElement(node) {
        if (/^(?:label|Label)(?:\.|$)/.test(getTagName(node.name) ?? "")) hasLabel = true;
      },
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier" && node.name.name === "aria-label") hasLabel = true;
      },
      "Program:exit"(node) {
        if (!hasLabel) context.report({ node, messageId: "missing" });
      },
    };
  },
};
