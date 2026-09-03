import { getAttribute, getTagName, hasElementChildren } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "表示を JSX で組み立てる ListBox.Item には textValue を付ける" },
    schema: [],
    messages: { missingTextValue: "textValueのない複合ListBox.Item" },
  },
  create(context) {
    return {
      JSXElement(node) {
        if (getTagName(node.openingElement.name) !== "ListBox.Item") return;
        if (getAttribute(node.openingElement, "textValue")) return;
        if (hasElementChildren(node)) context.report({ node: node.openingElement, messageId: "missingTextValue" });
      },
    };
  },
};
