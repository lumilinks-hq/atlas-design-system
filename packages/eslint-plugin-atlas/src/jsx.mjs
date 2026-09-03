// ESTree(typescript-estree)の JSX ノードを扱う共通ヘルパー

/** <Table.Root> → "Table.Root" */
export function getTagName(name) {
  if (!name) return undefined;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return `${getTagName(name.object)}.${name.property.name}`;
  if (name.type === "JSXNamespacedName") return `${name.namespace.name}:${name.name.name}`;
  return undefined;
}

/** <Toolbar.Root> → "Toolbar"。ドット記法の先頭識別子まで辿る */
export function getBaseName(name) {
  if (!name) return undefined;
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return getBaseName(name.object);
  return undefined;
}

export function isOpening(node) {
  return node.type === "JSXOpeningElement";
}

export function getAttribute(opening, attributeName) {
  return opening.attributes.find(
    (attribute) => attribute.type === "JSXAttribute" && attribute.name.type === "JSXIdentifier" && attribute.name.name === attributeName,
  );
}

/**
 * 属性値を静的に読む。
 * 文字列リテラル → string、値なし → true、識別子 → { identifier }、それ以外 → undefined
 */
export function getAttributeValue(attribute) {
  if (!attribute) return undefined;
  if (!attribute.value) return true;
  if (attribute.value.type === "Literal") return typeof attribute.value.value === "string" ? attribute.value.value : undefined;
  if (attribute.value.type === "JSXExpressionContainer") {
    const expression = attribute.value.expression;
    if (expression.type === "Literal" && typeof expression.value === "string") return expression.value;
    if (expression.type === "TemplateLiteral" && expression.expressions.length === 0) return expression.quasis[0]?.value.cooked;
    if (expression.type === "Identifier") return { identifier: expression.name };
  }
  return undefined;
}

export function getClassNames(opening) {
  const value = getAttributeValue(getAttribute(opening, "className"));
  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
}

/** element の子孫に tagName の JSX 要素があるか */
export function containsTag(element, tagName) {
  let found = false;
  const visit = (node) => {
    if (found || !node || typeof node.type !== "string") return;
    if (node.type === "JSXOpeningElement" && getTagName(node.name) === tagName) {
      found = true;
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === "string") visit(child);
    }
  };
  visit(element);
  return found;
}

/** 祖先の JSXElement を predicate で探す */
export function findAncestorElement(node, predicate) {
  let current = node.parent;
  while (current) {
    if (current.type === "JSXElement" && predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
}

/** JSXText の子がすべて空白だけか */
export function hasOnlyWhitespaceText(element) {
  return element.children.every((child) => child.type !== "JSXText" || child.value.trim().length === 0);
}

export function hasElementChildren(element) {
  return element.children.some((child) => child.type === "JSXElement" || child.type === "JSXFragment");
}
