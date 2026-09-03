import { containsTag, getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "取り消せない操作は AlertDialog.Trigger(内側は HeroUI Button)から確認画面を開く" },
    schema: [],
    messages: {
      noTrigger: "取り消せない操作にHeroUI AlertDialog.Triggerがありません",
      noButton: "AlertDialog.Triggerの内側にHeroUI Buttonがありません",
    },
  },
  create(context) {
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
        if (!/(削除|delete|remove)/i.test(context.sourceCode.text)) return;
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
