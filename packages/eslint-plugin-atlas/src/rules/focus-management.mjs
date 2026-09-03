import { containsTag, getAttribute, getTagName, hasOnlyWhitespaceText } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "Drawer.Root 内で Trigger と Backdrop を組にし、Trigger 自体へ主要 Button の視覚スタイルを付ける" },
    schema: [],
    messages: {
      noDrawer: "Drawer.Rootを確認できません",
      noBackdrop: "Drawer.Backdropを確認できません",
      nestedButton:
        "Drawer.Trigger内にHeroUI Buttonが入れ子です（buttonの入れ子はHTML違反）。Buttonを削除し、Drawer.Trigger自体へ主要Buttonの視覚スタイルのclassNameを付けてラベルテキストを直接入れてください",
      triggerClassName: "Drawer.Trigger自体にclassName（主要Buttonの視覚スタイル）を確認できません。ラベルはTriggerに直接入れます",
      closeTrigger: "Drawer.CloseTriggerがないか、狭い標準枠へ表示テキストを入れています",
    },
  },
  create(context) {
    let hasDrawer = false;
    let hasBackdrop = false;
    let triggerWithClassName = false;
    const nestedButtonTriggers = [];
    const closeTriggers = [];
    return {
      JSXOpeningElement(node) {
        const tagName = getTagName(node.name);
        if (tagName === "Drawer" || tagName === "Drawer.Root") hasDrawer = true;
        if (tagName === "Drawer.Backdrop") hasBackdrop = true;
        if (tagName === "Drawer.Trigger" && getAttribute(node, "className")) triggerWithClassName = true;
      },
      JSXElement(node) {
        const tagName = getTagName(node.openingElement.name);
        if (tagName === "Drawer.Trigger" && containsTag(node, "Button")) nestedButtonTriggers.push(node);
        if (tagName === "Drawer.CloseTrigger") closeTriggers.push(node);
      },
      "Program:exit"(node) {
        if (!hasDrawer) context.report({ node, messageId: "noDrawer" });
        for (const trigger of nestedButtonTriggers) context.report({ node: trigger.openingElement, messageId: "nestedButton" });
        if (!triggerWithClassName) context.report({ node, messageId: "triggerClassName" });
        if (!hasBackdrop) context.report({ node, messageId: "noBackdrop" });
        const iconOnlyClose = closeTriggers.length > 0 && closeTriggers.every(hasOnlyWhitespaceText);
        if (!iconOnlyClose) {
          context.report({ node: closeTriggers.find((element) => !hasOnlyWhitespaceText(element))?.openingElement ?? node, messageId: "closeTrigger" });
        }
      },
    };
  },
};
