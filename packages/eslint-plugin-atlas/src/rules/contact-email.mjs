import { getAttributeValue, getBaseName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "連絡先メールアドレスの入力に type=email を指定する" },
    schema: [],
    messages: { missing: "メール形式の入力制御を確認できません" },
  },
  create(context) {
    let hasField = false;
    let hasEmailType = false;
    return {
      JSXOpeningElement(node) {
        const base = getBaseName(node.name);
        if (base === "Input" || base === "TextField") hasField = true;
      },
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier" && node.name.name === "type" && getAttributeValue(node) === "email") hasEmailType = true;
      },
      "Program:exit"(node) {
        if (!(hasField && hasEmailType)) context.report({ node, messageId: "missing" });
      },
    };
  },
};
