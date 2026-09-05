import { getAttributeValue, getBaseName } from "../jsx.mjs";

// 形式検証を求める項目は題材ごとに変わる（顧客のメール、請求書の支払期限）。
// type は example の lint.requiredInputType から渡す。メッセージにも出して、
// 別題材の画面に「メール形式」を求める文言が出ないようにする
export default {
  meta: {
    type: "problem",
    docs: { description: "形式検証が要る入力に想定の type を指定する" },
    schema: [
      {
        type: "object",
        properties: { type: { type: "string", minLength: 1 } },
        required: ["type"],
        additionalProperties: false,
      },
    ],
    messages: { missing: "type={{type}} の入力制御を確認できません" },
  },
  create(context) {
    const expectedType = context.options[0].type;
    let hasField = false;
    let hasExpectedType = false;
    return {
      JSXOpeningElement(node) {
        const base = getBaseName(node.name);
        if (base === "Input" || base === "TextField") hasField = true;
      },
      JSXAttribute(node) {
        if (node.name.type === "JSXIdentifier" && node.name.name === "type" && getAttributeValue(node) === expectedType) {
          hasExpectedType = true;
        }
      },
      "Program:exit"(node) {
        if (!(hasField && hasExpectedType)) context.report({ node, messageId: "missing", data: { type: expectedType } });
      },
    };
  },
};
