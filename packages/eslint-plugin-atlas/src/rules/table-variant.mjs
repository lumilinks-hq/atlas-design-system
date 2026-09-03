import { getAttribute, getAttributeValue, getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "一覧の Table は契約で定義した variant を使う" },
    schema: [{ type: "object", properties: { variant: { type: "string" } }, additionalProperties: false }],
    messages: {
      mismatch: "検出variant: {{value}}(契約は {{expected}})",
      missing: "Table.Rootを確認できません",
    },
  },
  create(context) {
    const expected = context.options[0]?.variant ?? "primary";
    let roots = 0;
    return {
      JSXOpeningElement(node) {
        const tagName = getTagName(node.name);
        if (tagName !== "Table.Root" && tagName !== "Table") return;
        roots += 1;
        const value = getAttributeValue(getAttribute(node, "variant")) ?? "primary";
        if (value === expected) return;
        context.report({ node, messageId: "mismatch", data: { value: typeof value === "string" ? value : "動的指定", expected } });
      },
      "Program:exit"(node) {
        if (roots === 0) context.report({ node, messageId: "missing" });
      },
    };
  },
};
