import { findAncestorElement, getAttribute, getClassNames, getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "画面移動には href または to を持つ Link を使い、Button で遷移しない" },
    schema: [
      {
        type: "object",
        properties: {
          objectNameExpression: { type: "string" },
          backLinkPattern: { type: "string" },
          mobileListClass: { type: "string" },
          navigationTextPattern: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      navigationButton: "画面移動にButtonを使っています。hrefまたはtoを持つLinkにしてください",
      objectNameLink: "Tableのオブジェクト名({{expression}})をhrefまたはtoを持つLinkにしてください",
      mobileDetailLink: "モバイル一覧（.{{className}}内）の詳細導線をhrefまたはtoを持つLinkにしてください",
      backLink: "一覧へ戻る導線をhrefまたはtoを持つLinkにしてください",
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    // 判定語は experiment ごとに変わる。プラグインに既定値を置かず、渡されなかった検査は行わない
    const { objectNameExpression, mobileListClass } = options;
    const backLinkPattern = options.backLinkPattern ? new RegExp(options.backLinkPattern) : undefined;
    const navigationTextPattern = options.navigationTextPattern ? new RegExp(options.navigationTextPattern) : undefined;
    const sourceCode = context.sourceCode;

    let objectNameCell;
    let hasObjectNameLink = false;
    let hasMobileDetailLink = false;
    let hasBackLink = false;

    const hasTarget = (element) => Boolean(getAttribute(element.openingElement, "href") || getAttribute(element.openingElement, "to"));

    return {
      JSXElement(node) {
        const tagName = getTagName(node.openingElement.name);
        const text = sourceCode.getText(node);
        if (objectNameExpression && tagName === "Table.Cell" && !objectNameCell && text.includes(objectNameExpression)) {
          objectNameCell = node;
          hasObjectNameLink = /<(?:Link|RouterLink)\b[^>]*(?:href|to)=/.test(text);
        }
        if (tagName === "Link" || tagName === "RouterLink") {
          if (!hasTarget(node)) return;
          if (mobileListClass && findAncestorElement(node, (ancestor) => getClassNames(ancestor.openingElement).includes(mobileListClass))) {
            hasMobileDetailLink = true;
          }
          if (backLinkPattern?.test(text)) hasBackLink = true;
        }
        if ((tagName === "Button" || tagName === "ButtonRoot") && navigationTextPattern?.test(text)) {
          context.report({ node: node.openingElement, messageId: "navigationButton" });
        }
      },
      "Program:exit"(node) {
        if (objectNameExpression && !hasObjectNameLink) {
          context.report({ node: objectNameCell?.openingElement ?? node, messageId: "objectNameLink", data: { expression: objectNameExpression } });
        }
        if (mobileListClass && !hasMobileDetailLink) {
          context.report({ node, messageId: "mobileDetailLink", data: { className: mobileListClass } });
        }
        if (backLinkPattern && !hasBackLink) context.report({ node, messageId: "backLink" });
      },
    };
  },
};
