import { getAttribute, getAttributeValue, getTagName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "HeroUI の variant を Atlas のコンポーネント契約と一致させる" },
    schema: [
      {
        type: "object",
        properties: {
          variants: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: { name: { type: "string" }, variants: { type: "array", items: { type: "string" } } },
              required: ["name", "variants"],
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalid: "{{name}}: {{value}}",
      dynamic: "動的なvariantのため機械判定不能: {{name}} {{text}}",
    },
  },
  create(context) {
    const variants = context.options[0]?.variants ?? {};
    return {
      JSXOpeningElement(node) {
        const component = variants[getTagName(node.name)];
        if (!component) return;
        const attribute = getAttribute(node, "variant");
        if (!attribute) return;
        const value = getAttributeValue(attribute);
        if (typeof value === "string") {
          if (!component.variants.includes(value)) {
            context.report({ node: attribute, messageId: "invalid", data: { name: component.name, value } });
          }
          return;
        }
        context.report({
          node: attribute,
          messageId: "dynamic",
          data: { name: component.name, text: context.sourceCode.getText(attribute) },
        });
      },
    };
  },
};
