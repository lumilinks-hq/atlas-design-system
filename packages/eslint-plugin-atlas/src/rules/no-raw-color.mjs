const colorFunctions = new Set(["rgb", "rgba", "hsl", "hsla"]);

export default {
  meta: {
    type: "problem",
    docs: { description: "CSS に色コードや rgb()/hsl() を直接書かず、semantic token の CSS 変数を使う" },
    schema: [],
    messages: { rawColor: "raw color: {{value}}。design/tokens.json に対応する CSS 変数を使ってください" },
  },
  create(context) {
    return {
      Hash(node) {
        context.report({ node, messageId: "rawColor", data: { value: `#${node.value}` } });
      },
      Function(node) {
        if (colorFunctions.has(node.name.toLowerCase())) {
          context.report({ node, messageId: "rawColor", data: { value: `${node.name}()` } });
        }
      },
    };
  },
};
