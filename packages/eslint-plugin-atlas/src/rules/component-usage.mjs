import { getBaseName } from "../jsx.mjs";

export default {
  meta: {
    type: "problem",
    docs: { description: "Example の componentUsage が求める部品が JSX に現れることを求める(import だけでは足りない)" },
    schema: [
      {
        type: "object",
        properties: {
          componentUsage: {
            type: "array",
            items: { type: "object", properties: { name: { type: "string" }, implementation: { type: "string" } }, required: ["name", "implementation"] },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: { missing: "{{name}}: componentUsageで求められていますが実装に現れません" },
  },
  create(context) {
    const required = context.options[0]?.componentUsage ?? [];
    const rendered = new Set();
    return {
      JSXOpeningElement(node) {
        const base = getBaseName(node.name);
        if (base) rendered.add(base);
      },
      "Program:exit"(node) {
        for (const entry of required) {
          if (!rendered.has(entry.implementation)) context.report({ node, messageId: "missing", data: { name: entry.name } });
        }
      },
    };
  },
};
