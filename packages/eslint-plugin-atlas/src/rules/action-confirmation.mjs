import { containsTag, getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "取り消せない操作は AlertDialog.Trigger(内側は HeroUI Button)から確認画面を開く" },
    // 取り消せない操作の呼び名は題材ごとに変わる（削除、無効化）。example の
    // lint.irreversibleActionPattern から渡し、その語が無い画面には確認を求めない
    schema: [
      {
        type: "object",
        properties: { pattern: { type: "string", minLength: 1 } },
        required: ["pattern"],
        additionalProperties: false,
      },
    ],
    messages: {
      noTrigger: "取り消せない操作にHeroUI AlertDialog.Triggerがありません",
      noButton: "AlertDialog.Triggerの内側にHeroUI Buttonがありません",
    },
  },
  create(context) {
    const irreversibleAction = new RegExp(context.options[0].pattern, "i");
    let hasRoot = false;
    const triggers = [];
    return {
      JSXOpeningElement(node) {
        const tagName = getTagName(node.name);
        if (tagName === "AlertDialog.Root" || tagName === "AlertDialog") hasRoot = true;
      },
      JSXElement(node) {
        if (getTagName(node.openingElement.name) === "AlertDialog.Trigger") triggers.push(node);
      },
      "Program:exit"(node) {
        if (!irreversibleAction.test(context.sourceCode.text)) return;
        if (!hasRoot || triggers.length === 0) {
          context.report({ node, messageId: "noTrigger" });
          return;
        }
        if (!triggers.some((trigger) => containsTag(trigger, "Button"))) {
          context.report({ node: triggers[0].openingElement, messageId: "noButton" });
        }
      },
    };
  },
};
