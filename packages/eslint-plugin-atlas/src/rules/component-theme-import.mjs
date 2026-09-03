export default {
  meta: {
    type: "problem",
    docs: { description: "styles.css から Atlas の HeroUI theme adapter(design/component-theme.css)を読み込む" },
    schema: [{ type: "object", properties: { path: { type: "string" } }, additionalProperties: false }],
    messages: { missing: "{{path}}の読み込みを確認できません。@import で読み込んでください" },
  },
  create(context) {
    const path = context.options[0]?.path ?? "design/component-theme.css";
    let found = false;
    return {
      Atrule(node) {
        if (node.name.toLowerCase() !== "import" || !node.prelude) return;
        if (context.sourceCode.getText(node.prelude).includes(path)) found = true;
      },
      "StyleSheet:exit"(node) {
        if (!found) context.report({ node, messageId: "missing", data: { path } });
      },
    };
  },
};
