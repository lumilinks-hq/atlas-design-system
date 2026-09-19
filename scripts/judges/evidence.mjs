import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";
import ts from "typescript";
import { walk } from "../lib.mjs";

/**
 * 生成されたソースから、判定の材料を取り出す。ルールごとの絞り込みは questions.mjs が行う
 * @typedef {{ component: string, props: Record<string, string | true> }} ParentEvidence
 * @typedef {{ component: string, literalText: string }} SiblingEvidence
 * @typedef {{ file: string, line: number, component: string, props: Record<string, string | true>, text: string, literalText: string, children: string[], parent: ParentEvidence | null, siblings: SiblingEvidence[], footer?: SiblingEvidence[] }} ElementEvidence
 * @typedef {{ file: string, line: number, value: string, shownWith?: Record<string, string> }} StringEvidence
 * @typedef {{ file: string, line: number, kind: "catch" | "catch-callback" | "if", code: string, rendering: string[] }} FailureHandlerEvidence
 * @typedef {{ elements: ElementEvidence[], strings: StringEvidence[], failureHandlers: FailureHandlerEvidence[] }} SourceInventory
 */

// モデルに渡す 1 件の長さの上限。長すぎると関係のない部分で判定がぶれる
const maxExpressionLength = 200;
const maxCodeLength = 1500;
const maxRenderingLength = 800;
const maxRenderings = 3;
const maxSiblings = 12;
const maxSiblingText = 60;

// 結果が失敗だったときの分岐とみなす条件
const failureCondition = /!\s*[\w.?]*\.ok\b|\b(error|err|failed|failure|isError)\b|\bstatus\s*===?\s*["'](error|failed|failure)["']/i;
const errorLikeName = /error|fail|message|reason|feedback|notice|status/i;
// 通知の見出しと説明のように、一緒に画面に出る文字のキー。文言を並べた辞書（required、email など）は入れない
const messageKeys = new Set(["title", "description", "message", "detail", "details", "hint", "help", "helpText", "action", "actionLabel"]);
const sourceExtension = /\.(tsx|ts|jsx|js)$/;
const testFile = /\.(test|spec)\.[jt]sx?$|\.d\.ts$/;

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function collapse(value) {
  return value.replace(/\s+/g, " ").trim();
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function literalValue(sourceFile, node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.getText(sourceFile).slice(1, -1);
  return null;
}

function propertyName(property) {
  return ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : null;
}

function messageEntries(sourceFile, objectNode, except) {
  const entries = {};
  for (const property of objectNode.properties) {
    if (property === except || !ts.isPropertyAssignment(property) || !messageKeys.has(propertyName(property))) continue;
    const value = literalValue(sourceFile, property.initializer);
    if (value?.trim()) entries[propertyName(property)] = truncate(collapse(value), maxSiblingText);
  }
  return entries;
}

/** 同じ通知で一緒に出す文字。{ title, description } の組と、toast.error("…", { description }) の説明 */
function shownWithOf(sourceFile, node) {
  const parent = node.parent;
  let entries = {};
  if (ts.isPropertyAssignment(parent) && parent.initializer === node && ts.isObjectLiteralExpression(parent.parent) && messageKeys.has(propertyName(parent))) {
    entries = messageEntries(sourceFile, parent.parent, parent);
  } else if (ts.isCallExpression(parent) && parent.arguments.includes(node)) {
    for (const argument of parent.arguments) {
      if (ts.isObjectLiteralExpression(argument)) Object.assign(entries, messageEntries(sourceFile, argument));
    }
  }
  return Object.keys(entries).length > 0 ? entries : null;
}

function isModuleSpecifier(node) {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return parent.moduleSpecifier === node;
  // import("…") と require("…")
  return ts.isCallExpression(parent) && (parent.expression.kind === ts.SyntaxKind.ImportKeyword || parent.expression.getText() === "require");
}

function attributeValue(sourceFile, initializer) {
  if (initializer === undefined) return true;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer)) return `{${truncate(collapse(initializer.expression?.getText(sourceFile) ?? ""), maxExpressionLength)}}`;
  return initializer.getText(sourceFile);
}

function openingOf(node) {
  return ts.isJsxElement(node) ? node.openingElement : node;
}

/** 式の結果になりうる文字。比較の相手や関数の引数は表示されないので入れない */
function literalOutputs(sourceFile, expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [expression.text];
  if (ts.isTemplateExpression(expression)) return [expression.head.text + expression.templateSpans.map((span) => span.literal.text).join("")];
  if (ts.isParenthesizedExpression(expression)) return literalOutputs(sourceFile, expression.expression);
  if (ts.isConditionalExpression(expression)) return [...literalOutputs(sourceFile, expression.whenTrue), ...literalOutputs(sourceFile, expression.whenFalse)];
  if (ts.isBinaryExpression(expression)) {
    const operator = expression.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return literalOutputs(sourceFile, expression.right);
    if (operator === ts.SyntaxKind.BarBarToken || operator === ts.SyntaxKind.QuestionQuestionToken) {
      return [...literalOutputs(sourceFile, expression.left), ...literalOutputs(sourceFile, expression.right)];
    }
    return [];
  }
  if (ts.isJsxElement(expression) || ts.isJsxFragment(expression)) {
    const parts = [];
    collectText(sourceFile, expression, parts);
    return parts.map((part) => part.literal).filter(Boolean);
  }
  return [];
}

/** 子孫の文字を集める。text は式を {…} のまま、literal は表示されうる文字だけ */
function collectText(sourceFile, node, parts) {
  for (const child of node.children ?? []) {
    if (ts.isJsxText(child)) {
      const value = collapse(child.getText(sourceFile));
      if (value) parts.push({ text: value, literal: value });
    } else if (ts.isJsxExpression(child)) {
      if (!child.expression) continue;
      const literal = literalOutputs(sourceFile, child.expression).map(collapse).filter(Boolean).join(" ");
      if (ts.isStringLiteral(child.expression) || ts.isNoSubstitutionTemplateLiteral(child.expression)) {
        parts.push({ text: literal, literal });
      } else {
        parts.push({ text: `{${truncate(collapse(child.expression.getText(sourceFile)), maxExpressionLength)}}`, literal });
      }
    } else if (ts.isJsxElement(child) || ts.isJsxFragment(child)) {
      collectText(sourceFile, child, parts);
    }
  }
}

function propsOf(sourceFile, opening) {
  const props = {};
  for (const attribute of opening.attributes.properties) {
    if (ts.isJsxAttribute(attribute)) props[attribute.name.getText(sourceFile)] = attributeValue(sourceFile, attribute.initializer);
    else if (ts.isJsxSpreadAttribute(attribute)) props["..."] = `{...${attribute.expression.getText(sourceFile)}}`;
  }
  return props;
}

function textParts(sourceFile, node) {
  const parts = [];
  if (ts.isJsxElement(node)) collectText(sourceFile, node, parts);
  return {
    text: parts.map((part) => part.text).filter(Boolean).join(" "),
    literalText: parts.map((part) => part.literal).filter(Boolean).join(" "),
  };
}

/** いちばん近い親の部品。{…} の中にあっても、その外側の部品を親とみなす */
function parentElement(node) {
  let current = node.parent;
  while (current && !ts.isJsxElement(current)) current = current.parent;
  return current ?? null;
}

/** 親の中にある部品。{…} の中も含め、孫より深くは入らない */
function elementsUnder(parent) {
  const found = [];
  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      found.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  for (const child of parent.children) visit(child);
  return found;
}

function summaryOf(sourceFile, node) {
  return { component: openingOf(node).tagName.getText(sourceFile), literalText: truncate(textParts(sourceFile, node).literalText, maxSiblingText) };
}

/** ダイアログやドロワーの Body の中なら、同じ入れ物の Footer にある部品。再試行のボタンは Footer にあることが多い */
function footerOf(sourceFile, node) {
  let body = parentElement(node);
  while (body && !body.openingElement.tagName.getText(sourceFile).endsWith(".Body")) body = parentElement(body);
  const container = body && parentElement(body);
  if (!container) return null;
  const footer = elementsUnder(container).find((item) => ts.isJsxElement(item) && item.openingElement.tagName.getText(sourceFile).endsWith(".Footer"));
  const items = footer ? elementsUnder(footer).slice(0, maxSiblings).map((item) => summaryOf(sourceFile, item)) : [];
  return items.length > 0 ? items : null;
}

/** @returns {ElementEvidence} */
function elementEvidence(file, sourceFile, node) {
  const opening = openingOf(node);
  const children = ts.isJsxElement(node)
    ? node.children.filter((child) => ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)).map((child) => openingOf(child).tagName.getText(sourceFile))
    : [];
  const parent = parentElement(node);
  const siblings = parent
    ? elementsUnder(parent)
        .filter((sibling) => sibling !== node)
        .slice(0, maxSiblings)
        .map((sibling) => summaryOf(sourceFile, sibling))
    : [];
  const footer = footerOf(sourceFile, node);
  return {
    file,
    line: lineOf(sourceFile, node),
    component: opening.tagName.getText(sourceFile),
    props: propsOf(sourceFile, opening),
    ...textParts(sourceFile, node),
    children,
    parent: parent ? { component: parent.openingElement.tagName.getText(sourceFile), props: propsOf(sourceFile, parent.openingElement) } : null,
    siblings,
    ...(footer ? { footer } : {}),
  };
}

/** useState の setter と値の名前の対応。見つからなければ setFoo → foo とみなす */
function stateNames(sourceFile) {
  const names = new Map();
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isArrayBindingPattern(node.name) &&
      node.name.elements.length === 2 &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      /use(State|Reducer)$/.test(node.initializer.expression.getText(sourceFile))
    ) {
      const [value, setter] = node.name.elements;
      if (ts.isBindingElement(value) && ts.isBindingElement(setter)) names.set(setter.name.getText(sourceFile), value.name.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return (setter) => names.get(setter) ?? `${setter.charAt(3).toLowerCase()}${setter.slice(4)}`;
}

function containsCall(node) {
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (ts.isCallExpression(child)) found = true;
    else ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function referencesIdentifier(node, name) {
  let found = false;
  const visit = (child) => {
    if (found) return;
    if (ts.isIdentifier(child) && child.text === name) found = true;
    else ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

/** 失敗時の処理が値を入れる state を、どの JSX が表示しているか */
function renderingOf(sourceFile, handlerNode, stateName) {
  // setter ごとに、true/false 以外の値を入れているか
  const setters = new Map();
  const visitHandler = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^set[A-Z]/.test(node.expression.text)) {
      const argument = node.arguments[0];
      const isFlag = argument !== undefined && (argument.kind === ts.SyntaxKind.TrueKeyword || argument.kind === ts.SyntaxKind.FalseKeyword);
      setters.set(node.expression.text, (setters.get(node.expression.text) ?? false) || !isFlag);
    }
    ts.forEachChild(node, visitHandler);
  };
  visitHandler(handlerNode);
  // 送信中などのフラグは失敗の表示ではないので探さない。エラーらしい名前を先に探す
  const names = [...setters]
    .filter(([, hasValue]) => hasValue)
    .map(([setter]) => stateName(setter))
    .sort((a, b) => Number(errorLikeName.test(b)) - Number(errorLikeName.test(a)));
  if (names.length === 0) return [];

  const ranges = [];
  const visit = (node) => {
    if (ts.isJsxExpression(node) && node.expression && names.some((name) => referencesIdentifier(node.expression, name))) {
      // 属性の中の式だけでは何を表示しているかわからないので、部品ごと渡す
      const target = ts.isJsxAttribute(node.parent) ? node.parent.parent.parent : node;
      ranges.push(target);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...new Set(ranges)].slice(0, maxRenderings).map((node) => truncate(node.getText(sourceFile), maxRenderingLength));
}

/**
 * 1 ファイル分の材料を取り出す
 * @param {string} file 表示に使うファイル名
 * @param {string} code
 * @returns {SourceInventory}
 */
export function inventorySource(file, code) {
  const kind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  const stateName = stateNames(sourceFile);
  const elements = [];
  const strings = [];
  const failureHandlers = [];
  const handlerNodes = [];

  const addHandler = (kindName, node, codeNode) => {
    // 外側の処理に含まれる分岐は数えない
    if (handlerNodes.some((outer) => node.pos >= outer.pos && node.end <= outer.end)) return;
    handlerNodes.push(node);
    failureHandlers.push({
      file,
      line: lineOf(sourceFile, node),
      kind: kindName,
      code: truncate(codeNode.getText(sourceFile), maxCodeLength),
      rendering: renderingOf(sourceFile, codeNode, stateName),
    });
  };

  const addString = (node, value) => {
    const shownWith = shownWithOf(sourceFile, node);
    strings.push({ file, line: lineOf(sourceFile, node), value, ...(shownWith ? { shownWith } : {}) });
  };

  const visit = (node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) elements.push(elementEvidence(file, sourceFile, node));

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isModuleSpecifier(node) && node.text.trim()) {
      addString(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      addString(node, node.getText(sourceFile).slice(1, -1));
    } else if (ts.isJsxText(node)) {
      const value = collapse(node.getText(sourceFile));
      if (value) strings.push({ file, line: lineOf(sourceFile, node), value });
    }

    if (ts.isCatchClause(node)) addHandler("catch", node, node);
    else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "catch" && node.arguments[0]) {
      addHandler("catch-callback", node, node.arguments[0]);
    } else if (ts.isIfStatement(node) && failureCondition.test(node.expression.getText(sourceFile)) && containsCall(node.thenStatement)) {
      // 値を返すだけの分岐は表示の切り替え。失敗時の処理なら state の更新や通知を呼ぶ
      addHandler("if", node, node);
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { elements, strings, failureHandlers };
}

/**
 * Run の source ディレクトリ全体の材料。テストと型定義は読まない
 * @param {string} sourceDir
 * @returns {Promise<SourceInventory>}
 */
export async function inventoryRun(sourceDir) {
  const inventory = { elements: [], strings: [], failureHandlers: [] };
  for (const path of await walk(sourceDir)) {
    if (!sourceExtension.test(path) || testFile.test(path)) continue;
    const file = relative(sourceDir, path).split(sep).join("/");
    const part = inventorySource(file, await readFile(path, "utf8"));
    inventory.elements.push(...part.elements);
    inventory.strings.push(...part.strings);
    inventory.failureHandlers.push(...part.failureHandlers);
  }
  return inventory;
}
