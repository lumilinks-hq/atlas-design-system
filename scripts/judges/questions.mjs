/**
 * evidence.mjs が取り出した材料から、ルールごとに Jev へ聞く質問を作る。
 * コードで決まるものは decided に入れ、モデルには聞かない。
 * 質問はどれも「はい」が違反になる向きで書く。
 * @typedef {import("./evidence.mjs").SourceInventory} SourceInventory
 * @typedef {import("./evidence.mjs").ElementEvidence} ElementEvidence
 * @typedef {{ type: "noul", instructions: string, criteria: { true: string, false: string } }} NoulQuestion
 * @typedef {{ subject: string, probability: number, reason: string }} DecidedDetail
 * @typedef {{ subject: string, state: object, questions: Record<string, NoulQuestion>, violation: (answers: Record<string, number>) => number }} AskItem
 * @typedef {{ decided: DecidedDetail[], ask: AskItem[], insufficient: boolean, note: string }} QuestionPlan
 */

const maxLabelLength = 40;
const maxStringLength = 200;
// 1 Run で聞く件数の上限。1 件ごとに API を呼ぶので、多すぎる Run は残りを note に書く
const maxFailureHandlers = 8;
const maxErrorStrings = 12;

const control = /(^|\.)(Button|IconButton|Link|CloseTrigger|ClearButton|Trigger|CloseButton)$|^(button|a)$/;
const statusChip = /(^|\.)(Chip|Badge)(\.Root)?$/;
const errorSurface = /(^|\.)(Alert|FieldError|ErrorMessage|\w*Feedback|\w*Notice|\w*Banner|Callout)(\.Root)?$/;
const alwaysErrorSurface = /(^|\.)(FieldError|ErrorMessage)$/;
const errorTone = /danger|error|warning/i;
const errorWords = /失敗|エラー|できません|できなかった|問題が発生|無効|不正|正しく|形式|必須|入力してください|error|fail|invalid/i;
// 空白のない ASCII だけの文字列は "error" や "danger" のような値で、画面の文言ではない
const codeToken = /^[\x21-\x7e]+$/;
const letter = /\p{L}/u;

// design/components-api.md:207 の正本は aria-label を付けない。部品が既定の名前を持つ
const namedByLibrary = new Set(["SearchField.ClearButton"]);
// design/components-api.md:232 の正本。Select の Label が Trigger の名前になる
const labelledByField = new Map([["Select.Trigger", "Select"]]);
// design/components-api.md:149 の正本。部品の既定名は英語の "Close" なので、aria-label がなければ違反
const requiresAriaLabel = new Map([["Drawer.CloseTrigger", "design/components-api.md:149"]]);

const expressionNote = "Text in braces `{…}` is a JavaScript expression that renders text at runtime; judge what it produces from its name.";

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** 画面に出る名前。aria-label、文字、title、式の順に探す */
function labelOf(element) {
  const label = [element.props["aria-label"], element.literalText, element.props.title, element.text].find(nonEmptyString);
  return label ? truncate(label, maxLabelLength) : "";
}

function subjectOf(element) {
  const label = labelOf(element);
  return `${element.file}:${element.line} ${element.component}${label ? `「${label}」` : ""}`;
}

function noul(instructions, whenTrue, whenFalse) {
  return { type: "noul", instructions, criteria: { true: whenTrue, false: whenFalse } };
}

function withoutUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function plan(decided, ask, note = "") {
  return { decided, ask, insufficient: decided.length === 0 && ask.length === 0, note };
}

function hasAriaLabel(element) {
  return nonEmptyString(element.props["aria-label"]) || nonEmptyString(element.props["aria-labelledby"]);
}

/** @returns {string | null} コードで名前が決まるなら、その理由 */
function nameFromCode(element) {
  if (hasAriaLabel(element)) return "aria-label がある";
  if (letter.test(element.literalText)) return "文字がある";
  if (namedByLibrary.has(element.component)) return "部品の既定の名前がある";
  const field = labelledByField.get(element.component);
  if (field && (element.parent?.component === field || element.parent?.component === `${field}.Root`)) {
    if (nonEmptyString(element.parent.props["aria-label"])) return `${field} の aria-label が名前になる`;
    if (element.siblings.some((sibling) => sibling.component === "Label" && letter.test(sibling.literalText))) return "Label が名前になる";
  }
  return null;
}

const controlNameQuestions = {
  unnamed: noul(
    `Decide whether screen reader users would get no usable accessible name for this interactive control. The name comes from \`aria-label\`, \`aria-labelledby\`, visible text inside the control, or an associated Label. Icons alone give no name. ${expressionNote}`,
    "The control has no accessible name, so users cannot tell what it does.",
    "The control has an accessible name that tells users what it does, including text rendered from an expression such as a record's name.",
  ),
};

/** @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildControlName(inventory) {
  const decided = [];
  const ask = [];
  for (const element of inventory.elements.filter((item) => control.test(item.component))) {
    const contract = requiresAriaLabel.get(element.component);
    if (contract && !hasAriaLabel(element)) {
      decided.push({ subject: subjectOf(element), probability: 1, reason: `aria-label がない（${contract}）` });
      continue;
    }
    const reason = nameFromCode(element);
    if (reason) {
      decided.push({ subject: subjectOf(element), probability: 0, reason });
      continue;
    }
    ask.push({
      subject: subjectOf(element),
      state: withoutUndefined({
        component: element.component,
        props: element.props,
        visibleText: element.text,
        childComponents: element.children,
        parent: element.parent ?? undefined,
        siblings: element.siblings,
      }),
      questions: controlNameQuestions,
      violation: (answers) => answers.unnamed,
    });
  }
  return plan(decided, ask);
}

const colorOnlyQuestions = {
  colorOnly: noul(
    `Decide whether this status chip or badge conveys its meaning only through color, without readable text. ${expressionNote}`,
    "The chip shows no readable text, or only an icon or color, so the status depends on color alone.",
    "The chip shows a readable label such as a status name, so the meaning does not depend on color.",
  ),
};

/** @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildColorOnly(inventory) {
  const decided = [];
  const ask = [];
  for (const element of inventory.elements.filter((item) => statusChip.test(item.component))) {
    if (letter.test(element.literalText)) {
      decided.push({ subject: subjectOf(element), probability: 0, reason: "文字がある" });
      continue;
    }
    ask.push({
      subject: subjectOf(element),
      state: { component: element.component, props: element.props, visibleText: element.text, childComponents: element.children },
      questions: colorOnlyQuestions,
      violation: (answers) => answers.colorOnly,
    });
  }
  return plan(decided, ask);
}

const semanticQuestions = {
  normalAction: noul(
    "This button uses the design system's danger color, which is reserved for destructive or irreversible actions such as delete, remove, void, or discard. Decide whether the button's action is a normal, non-destructive action such as save, submit, register, edit, or navigate. The label may be in Japanese.",
    "The action is normal and not destructive, so the danger color is misused.",
    "The action is destructive or irreversible, so the danger color fits.",
  ),
};

/** @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildColorSemantic(inventory) {
  const ask = inventory.elements
    .filter((item) => control.test(item.component) && [item.props.variant, item.props.color].some((value) => typeof value === "string" && /danger/i.test(value)))
    .map((element) => ({
      subject: subjectOf(element),
      state: withoutUndefined({
        component: element.component,
        variant: [element.props.variant, element.props.color].find((value) => typeof value === "string" && /danger/i.test(value)),
        label: labelOf(element),
        onPress: element.props.onPress ?? element.props.onClick,
      }),
      questions: semanticQuestions,
      violation: (answers) => answers.normalAction,
    }));
  // danger の操作がないのは違反がないということで、材料不足ではない
  return { decided: [], ask, insufficient: false, note: "CSS やクラスで付けた色は見ていない" };
}

const errorRecoveryQuestions = {
  isError: noul(
    `Decide whether this text or component tells the user that something went wrong: an error, a failed operation, or invalid input. ${expressionNote}`,
    "It reports an error, a failed operation, or invalid input.",
    "It is not an error, for example a success message, a hint, a label, an empty state, or a warning about what an action the user is about to confirm will do, such as \"this cannot be undone\".",
  ),
  lacksRecovery: noul(
    "Assume this is an error message. Decide whether it leaves the user without a way to recover: no next step, no valid value or format, and no retry. Consider components listed in `nearby` and, inside a dialog or drawer, buttons in its `footer`, such as a retry button.",
    "It only says that something failed, with no next step, valid value, or retry.",
    "It tells the user how to fix or retry, such as the expected format, the field to fill in, or a retry action nearby.",
  ),
};

// 部品の外の文言。見出しと説明のように一緒に出す文字は shownWith に入る
const errorTextRecoveryQuestions = {
  ...errorRecoveryQuestions,
  lacksRecovery: {
    ...errorRecoveryQuestions.lacksRecovery,
    instructions:
      "Assume this is an error message. Decide whether it leaves the user without a way to recover: no next step, no valid value or format, and no retry. `shownWith` holds text shown together with it, such as a description; treat it as part of the message.",
  },
};

function stringProps(element) {
  return Object.values(element.props).filter((value) => typeof value === "string" && !value.startsWith("{"));
}

function isErrorSurface(element) {
  if (!errorSurface.test(element.component)) return false;
  if (alwaysErrorSurface.test(element.component)) return true;
  if ([element.props.status, element.props.color, element.props.variant, element.props.tone].some((value) => typeof value === "string" && errorTone.test(value))) return true;
  return errorWords.test([element.literalText, ...stringProps(element)].join(" "));
}

/** @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildErrorRecovery(inventory) {
  const surfaces = inventory.elements.filter(isErrorSurface);
  const ask = surfaces.map((element) => ({
    subject: subjectOf(element),
    state: { component: element.component, props: element.props, visibleText: element.text, nearby: element.siblings, ...(element.footer ? { footer: element.footer } : {}) },
    questions: errorRecoveryQuestions,
    violation: (answers) => answers.isError * answers.lacksRecovery,
  }));

  // 表示部品の外にある文言。部品の中の文言は、部品ごと聞いている
  const shown = surfaces.flatMap((element) => [element.text, element.literalText, ...stringProps(element)]);
  const seen = new Set();
  const messages = inventory.strings.filter((item) => {
    const value = item.value.trim();
    if (!errorWords.test(value) || codeToken.test(value) || seen.has(value)) return false;
    seen.add(value);
    return !shown.some((text) => text.includes(value));
  });
  for (const item of messages.slice(0, maxErrorStrings)) {
    const text = truncate(item.value.trim(), maxStringLength);
    ask.push({
      subject: `${item.file}:${item.line} 文言「${truncate(text, maxLabelLength)}」`,
      state: item.shownWith ? { text, shownWith: item.shownWith } : { text },
      questions: errorTextRecoveryQuestions,
      violation: (answers) => answers.isError * answers.lacksRecovery,
    });
  }
  const skipped = messages.length - Math.min(messages.length, maxErrorStrings);
  return plan([], ask, skipped > 0 ? `ほか ${skipped} 件の文言は聞いていない` : "");
}

const failureQuestions = {
  isOperationFailure: noul(
    "This code runs when something fails in a web app. Decide whether it handles the failure of a user operation or data request, such as saving, deleting, or loading data. Form validation that stops before sending anything is not an operation failure.",
    "It handles a failed save, delete, load, or other request.",
    "It handles form validation, a display condition, or something else that is not a failed operation.",
  ),
  toastOnly: noul(
    "Decide whether the user learns about this failure only from a temporary toast, or not at all. `renderedBy` lists JSX that displays state set by this code; an Alert or inline error there stays on screen.",
    "The failure appears only in a temporary toast or not at all; nothing stays on screen.",
    "A message stays on screen, such as an Alert or inline error rendered from state set here.",
  ),
  closesSurface: noul(
    "Decide whether this code closes the drawer, dialog, or form, or clears what the user entered, when the failure happens.",
    "It closes or resets the drawer, dialog, or form, so the user loses the context or the input.",
    "It keeps the drawer, dialog, or form open with the user's input.",
  ),
};

/** @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildStateFailure(inventory) {
  const handlers = inventory.failureHandlers;
  const ask = handlers.slice(0, maxFailureHandlers).map((handler) => ({
    subject: `${handler.file}:${handler.line} 失敗時の処理（${handler.kind}）`,
    state: { kind: handler.kind, code: handler.code, renderedBy: handler.rendering },
    questions: failureQuestions,
    violation: (answers) => answers.isOperationFailure * Math.max(answers.toastOnly, answers.closesSurface),
  }));
  const skipped = handlers.length - ask.length;
  return plan([], ask, skipped > 0 ? `ほか ${skipped} 件の失敗時の処理は聞いていない` : "");
}

const builders = {
  "a11y.control-name": buildControlName,
  "a11y.color-only": buildColorOnly,
  "color.semantic": buildColorSemantic,
  "a11y.error-recovery": buildErrorRecovery,
  "state.failure": buildStateFailure,
};

export const supportedRuleIds = Object.keys(builders);

/**
 * @param {string} ruleId
 * @param {SourceInventory} inventory
 * @returns {QuestionPlan | null} 対応していないルールなら null
 */
export function buildQuestions(ruleId, inventory) {
  const build = builders[ruleId];
  return build ? build(inventory) : null;
}
