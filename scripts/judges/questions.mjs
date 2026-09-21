/**
 * evidence.mjs が取り出した材料から、ルールごとの判定を組み立てる。
 * コードで決まるものは decided に入れ、意味の判定が要るものだけ Jev に聞く（ask）。
 * 質問はどれも「はい」が違反になる向きで書く。
 * 名前の有無や文字の有無はコードで決まるので聞かない。判定が確率の中間に集まるだけだったルール
 * （a11y.error-recovery）は builders から外した。docs/JEV_DESIGN_CHECK.md に経緯を書いてある。
 * @typedef {import("./evidence.mjs").SourceInventory} SourceInventory
 * @typedef {import("./evidence.mjs").ElementEvidence} ElementEvidence
 * @typedef {{ type: "noul", instructions: string, criteria: { true: string, false: string } }} NoulQuestion
 * @typedef {{ subject: string, probability: number, reason: string }} DecidedDetail
 * @typedef {{ subject: string, state: object, questions: Record<string, NoulQuestion>, violation: (answers: Record<string, number>) => number }} AskItem
 * @typedef {{ decided: DecidedDetail[], ask: AskItem[], insufficient: boolean, note: string }} QuestionPlan
 */

const maxLabelLength = 40;
// 1 Run で聞く件数の上限。1 件ごとに API を呼ぶので、多すぎる Run は残りを note に書く
const maxFailureHandlers = 8;

const control = /(^|\.)(Button|IconButton|Link|CloseTrigger|ClearButton|Trigger|CloseButton)$|^(button|a)$/;
const statusChip = /(^|\.)(Chip|Badge)(\.Root)?$/;
const letter = /\p{L}/u;

// design/components-api.md:207 の正本は aria-label を付けない。部品が既定の名前を持つ
const namedByLibrary = new Set(["SearchField.ClearButton"]);
// design/components-api.md:232 の正本。Select の Label が Trigger の名前になる
const labelledByField = new Map([["Select.Trigger", "Select"]]);
// design/components-api.md:149 の正本。部品の既定名は英語の "Close" なので、aria-label がなければ違反
const requiresAriaLabel = new Map([["Drawer.CloseTrigger", "design/components-api.md:149"]]);

// {…} の中身と spread で渡る props は読んでいない。どちらも「文字が出る」側に倒して通す
const unseenNote = "式や spread で渡すものの中身は見ていない";

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

/** props を spread で渡している。渡す側の名前は読めないので、名前があるものとして扱う */
function hasSpread(element) {
  return element.props["..."] !== undefined;
}

/** {…} で文字を出している。式の中身は読まず、文字が出るものとして扱う */
function hasExpressionText(element) {
  return element.text.includes("{");
}

/** @returns {string | null} コードで名前が決まるなら、その理由 */
function nameFromCode(element) {
  if (hasAriaLabel(element)) return "aria-label がある";
  if (letter.test(element.literalText)) return "文字がある";
  if (nonEmptyString(element.props.title)) return "title がある";
  if (namedByLibrary.has(element.component)) return "部品の既定の名前がある";
  const field = labelledByField.get(element.component);
  if (field && (element.parent?.component === field || element.parent?.component === `${field}.Root`)) {
    if (nonEmptyString(element.parent.props["aria-label"])) return `${field} の aria-label が名前になる`;
    if (element.siblings.some((sibling) => sibling.component === "Label" && letter.test(sibling.literalText))) return "Label が名前になる";
  }
  if (hasSpread(element)) return "spread で渡す props は見ていない";
  if (hasExpressionText(element)) return "式で文字を出す";
  return null;
}

/** 名前の有無はコードで決まる。Jev には聞かない @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildControlName(inventory) {
  const decided = inventory.elements
    .filter((item) => control.test(item.component))
    .map((element) => {
      const subject = subjectOf(element);
      const contract = requiresAriaLabel.get(element.component);
      if (contract && !hasAriaLabel(element)) return { subject, probability: 1, reason: `aria-label がない（${contract}）` };
      const reason = nameFromCode(element);
      return reason ? { subject, probability: 0, reason } : { subject, probability: 1, reason: "名前になる文字がない" };
    });
  return plan(decided, [], unseenNote);
}

/** 文字の有無はコードで決まる。Jev には聞かない @param {SourceInventory} inventory @returns {QuestionPlan} */
function buildColorOnly(inventory) {
  const decided = inventory.elements
    .filter((item) => statusChip.test(item.component))
    .map((element) => {
      const subject = subjectOf(element);
      if (letter.test(element.literalText)) return { subject, probability: 0, reason: "文字がある" };
      if (hasSpread(element)) return { subject, probability: 0, reason: "spread で渡す props は見ていない" };
      if (hasExpressionText(element)) return { subject, probability: 0, reason: "式で文字を出す" };
      return { subject, probability: 1, reason: "文字がない" };
    });
  return plan(decided, [], unseenNote);
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
