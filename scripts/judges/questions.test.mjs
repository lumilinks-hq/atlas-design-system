// @vitest-environment node
import { describe, expect, it } from "vitest";
import { inventorySource } from "./evidence.mjs";
import { buildQuestions, supportedRuleIds } from "./questions.mjs";

const japanese = /[぀-ヿ一-鿿]/;

function build(ruleId, code, file = "App.tsx") {
  return buildQuestions(ruleId, inventorySource(file, code));
}

function subjects(items) {
  return items.map((item) => item.subject);
}

/** Jev に送る質問は英語で書く。日本語は state にだけ入れる */
function expectEnglishQuestions(plan) {
  for (const item of plan.ask) {
    for (const question of Object.values(item.questions)) {
      expect(question.instructions).not.toMatch(japanese);
      expect(question.criteria.true).not.toMatch(japanese);
      expect(question.criteria.false).not.toMatch(japanese);
    }
  }
}

describe("buildQuestions", () => {
  it("対応するルールだけ質問を作る", () => {
    expect(supportedRuleIds).toEqual(["a11y.control-name", "a11y.color-only", "color.semantic", "a11y.error-recovery", "state.failure"]);
    expect(buildQuestions("layout.spacing", inventorySource("App.tsx", ""))).toBeNull();
  });
});

describe("a11y.control-name", () => {
  const code = `export const App = ({ customer, isOpen }) => (
  <main>
    <Button onPress={save}>保存</Button>
    <Button aria-label="削除" isIconOnly><TrashIcon /></Button>
    <Button isIconOnly onPress={remove}><TrashIcon /></Button>
    <Button>{isSaving ? "保存中" : "保存"}</Button>
    <SearchField aria-label="企業名で検索">
      <SearchField.Group><SearchField.Input /><SearchField.ClearButton /></SearchField.Group>
    </SearchField>
    <Select>
      <Label>ステータス</Label>
      <Select.Trigger><Select.Value /></Select.Trigger>
    </Select>
    <Select>
      <Select.Trigger><Select.Value /></Select.Trigger>
    </Select>
    <Drawer.Dialog>
      <Drawer.CloseTrigger />
    </Drawer.Dialog>
    <Link href="#">{customer.companyName}</Link>
  </main>
);
`;
  const plan = build("a11y.control-name", code);

  it("文字、aria-label、Label、部品の既定名で名前が決まるものはコードで通す", () => {
    expect(plan.insufficient).toBe(false);
    const passed = plan.decided.filter((item) => item.probability === 0);
    expect(subjects(passed)).toEqual([
      "App.tsx:3 Button「保存」",
      "App.tsx:4 Button「削除」",
      "App.tsx:6 Button「保存中 保存」",
      "App.tsx:8 SearchField.ClearButton",
      "App.tsx:12 Select.Trigger",
    ]);
    expect(plan.decided.find((item) => item.subject.includes("ClearButton")).reason).toContain("既定");
    expect(plan.decided.find((item) => item.subject.includes("Select.Trigger")).reason).toContain("Label");
  });

  it("aria-label のない Drawer.CloseTrigger は、Jev に聞かずコードで違反にする。部品の既定名は英語の Close なので", () => {
    const closeTrigger = plan.decided.find((item) => item.subject === "App.tsx:18 Drawer.CloseTrigger");
    expect(closeTrigger).toMatchObject({ probability: 1 });
    expect(closeTrigger.reason).toContain("components-api.md:149");
    // aria-label があれば通す
    const labelled = build("a11y.control-name", `export const A = () => <Drawer.CloseTrigger aria-label="閉じる" />;\n`);
    expect(labelled.decided).toMatchObject([{ probability: 0 }]);
    expect(labelled.ask).toEqual([]);
  });

  it("アイコンだけの操作、Label のない Select、式の文字だけのリンクは Jev に聞く", () => {
    expect(subjects(plan.ask)).toEqual([
      "App.tsx:5 Button",
      "App.tsx:15 Select.Trigger",
      "App.tsx:20 Link「{customer.companyName}」",
    ]);
    const iconButton = plan.ask[0];
    expect(iconButton.state).toMatchObject({ component: "Button", props: { isIconOnly: true }, visibleText: "", childComponents: ["TrashIcon"] });
    expect(Object.keys(iconButton.questions)).toEqual(["unnamed"]);
    expect(iconButton.violation({ unnamed: 0.9 })).toBe(0.9);
    expectEnglishQuestions(plan);
  });

  it("親が Select.Root と書かれていても Label を名前とみなす", () => {
    const rooted = build(
      "a11y.control-name",
      `export const A = () => (
  <Select.Root>
    <Label>ステータス</Label>
    <Select.Trigger><Select.Value /></Select.Trigger>
  </Select.Root>
);
`,
    );
    expect(subjects(rooted.decided)).toEqual(["App.tsx:4 Select.Trigger"]);
    expect(rooted.ask).toEqual([]);
  });

  it("操作要素がなければ材料不足", () => {
    expect(build("a11y.control-name", "export const A = () => <main><p>本文</p></main>;\n").insufficient).toBe(true);
  });
});

describe("a11y.color-only", () => {
  const code = `export const App = ({ customer }) => (
  <main>
    <Chip color="success">有効</Chip>
    <Chip.Root variant={getStatusVariant(customer.status)}>{statusLabel(customer.status)}</Chip.Root>
    <Chip color="danger" />
  </main>
);
`;
  const plan = build("a11y.color-only", code);

  it("文字のある Chip はコードで通し、式や空の Chip は Jev に聞く", () => {
    expect(subjects(plan.decided)).toEqual(["App.tsx:3 Chip「有効」"]);
    expect(subjects(plan.ask)).toEqual(["App.tsx:4 Chip.Root「{statusLabel(customer.status)}」", "App.tsx:5 Chip"]);
    expect(plan.ask[0].state).toMatchObject({ component: "Chip.Root", visibleText: "{statusLabel(customer.status)}" });
    expect(plan.ask[0].violation({ colorOnly: 0.2 })).toBe(0.2);
    expectEnglishQuestions(plan);
  });

  it("Chip や Badge がなければ材料不足", () => {
    expect(build("a11y.color-only", "export const A = () => <Button>保存</Button>;\n").insufficient).toBe(true);
  });
});

describe("color.semantic", () => {
  it("danger の操作だけを Jev に聞く。通常の操作ならば違反", () => {
    const code = `export const App = () => (
  <main>
    <Button variant="danger">保存</Button>
    <Button variant="danger-soft" onPress={remove}>顧客を削除</Button>
    <Button variant="primary">登録</Button>
  </main>
);
`;
    const plan = build("color.semantic", code);
    expect(plan.insufficient).toBe(false);
    expect(subjects(plan.ask)).toEqual(["App.tsx:3 Button「保存」", "App.tsx:4 Button「顧客を削除」"]);
    expect(plan.ask[1].state).toMatchObject({ component: "Button", variant: "danger-soft", label: "顧客を削除", onPress: "{remove}" });
    expect(plan.ask[0].violation({ normalAction: 0.95 })).toBe(0.95);
    expectEnglishQuestions(plan);
  });

  it("danger の操作がなければ聞かずに違反なし。CSS の色は見ていないと書く", () => {
    const plan = build("color.semantic", "export const A = () => <Button variant=\"primary\">保存</Button>;\n");
    expect(plan).toMatchObject({ insufficient: false, decided: [], ask: [] });
    expect(plan.note).toContain("CSS");
  });
});

describe("a11y.error-recovery", () => {
  const code = `const messages = { required: "会社名を入力してください", email: "メールアドレスの形式が正しくありません" };
const status = "error";
export const App = ({ deleteError, saved }) => (
  <main>
    {deleteError ? (
      <Alert.Root status="danger">
        <Alert.Title>削除できませんでした</Alert.Title>
        <Alert.Description>{deleteError}</Alert.Description>
      </Alert.Root>
    ) : null}
    <Button>再試行</Button>
    <Alert status="success">保存しました</Alert>
    <StatusFeedback title="顧客を削除できませんでした" description={deleteError} />
    <p>会社名を入力してください</p>
  </main>
);
`;
  const plan = build("a11y.error-recovery", code);

  it("エラーの表示部品と、部品の外にあるエラーらしい文言を Jev に聞く。同じ文言は 1 回だけ", () => {
    expect(subjects(plan.ask)).toEqual([
      "App.tsx:6 Alert.Root「削除できませんでした」",
      "App.tsx:13 StatusFeedback「顧客を削除できませんでした」",
      "App.tsx:1 文言「会社名を入力してください」",
      "App.tsx:1 文言「メールアドレスの形式が正しくありません」",
    ]);
  });

  it("表示部品には周りの部品を添え、エラーかどうかと回復方法がないかを同じ state で聞く", () => {
    const alert = plan.ask[0];
    expect(alert.state).toMatchObject({ component: "Alert.Root", visibleText: "削除できませんでした {deleteError}" });
    expect(alert.state.nearby.map((item) => item.component)).toContain("Button");
    expect(Object.keys(alert.questions)).toEqual(["isError", "lacksRecovery"]);
    expect(alert.violation({ isError: 0.5, lacksRecovery: 0.8 })).toBeCloseTo(0.4);
    expect(plan.ask[1].state.props).toMatchObject({ title: "顧客を削除できませんでした", description: "{deleteError}" });
    expect(plan.ask[2].state).toEqual({ text: "会社名を入力してください" });
    expectEnglishQuestions(plan);
  });

  it("文言と一緒に出す説明があれば state に添え、回復の案内をそこからも探させる", () => {
    const withDescription = build(
      "a11y.error-recovery",
      `const failure = { title: "顧客情報を更新できませんでした", description: "入力内容を保持したまま再試行できます。" };\n`,
    );

    expect(withDescription.ask[0].state).toEqual({
      text: "顧客情報を更新できませんでした",
      shownWith: { description: "入力内容を保持したまま再試行できます。" },
    });
    expect(withDescription.ask[0].questions.lacksRecovery.instructions).toContain("`shownWith`");
    expectEnglishQuestions(withDescription);
  });

  it("ダイアログの中のエラー表示には Footer のボタンを添え、回復の操作をそこからも探させる", () => {
    const inDialog = build(
      "a11y.error-recovery",
      `export const D = ({ errorReason }) => (
  <AlertDialog.Dialog>
    <AlertDialog.Body>
      <Alert status="danger"><Alert.Title>削除できませんでした</Alert.Title></Alert>
    </AlertDialog.Body>
    <AlertDialog.Footer><Button onPress={runDelete}>再試行</Button></AlertDialog.Footer>
  </AlertDialog.Dialog>
);
`,
    );
    expect(inDialog.ask[0].state.footer).toEqual([{ component: "Button", literalText: "再試行" }]);
    expect(inDialog.ask[0].questions.lacksRecovery.instructions).toContain("`footer`");
    // ダイアログの外なら footer は state に入れない
    expect(plan.ask[0].state).not.toHaveProperty("footer");
    expectEnglishQuestions(inDialog);
  });

  it("操作の前に出す注意書き（取り消せない、など）はエラーではないと基準に書く", () => {
    for (const item of plan.ask) {
      expect(item.questions.isError.criteria.false).toMatch(/cannot be undone/);
    }
  });

  it("エラーらしい文言がなければ材料不足", () => {
    expect(build("a11y.error-recovery", "export const A = () => <p>顧客一覧</p>;\n").insufficient).toBe(true);
  });
});

describe("state.failure", () => {
  const code = `export function App() {
  const [saveError, setSaveError] = useState(null);
  const save = async () => {
    try {
      await api.save();
    } catch (error) {
      toast.danger("保存できませんでした");
      setIsOpen(false);
    }
    if (!result.ok) {
      setSaveError(result.reason);
    }
  };
  return <main>{saveError ? <Alert status="danger">{saveError}</Alert> : null}</main>;
}
`;
  const plan = build("state.failure", code);

  it("失敗時の処理ごとに、コードと表示している JSX を渡して聞く", () => {
    expect(subjects(plan.ask)).toEqual(["App.tsx:6 失敗時の処理（catch）", "App.tsx:10 失敗時の処理（if）"]);
    expect(plan.ask[1].state.code).toContain("setSaveError(result.reason)");
    expect(plan.ask[1].state.renderedBy[0]).toContain("<Alert");
    expect(Object.keys(plan.ask[0].questions)).toEqual(["isOperationFailure", "toastOnly", "closesSurface"]);
    expectEnglishQuestions(plan);
  });

  it("操作の失敗であり、かつ toast だけか閉じてしまうなら違反", () => {
    const { violation } = plan.ask[0];
    expect(violation({ isOperationFailure: 1, toastOnly: 0.9, closesSurface: 0.1 })).toBeCloseTo(0.9);
    expect(violation({ isOperationFailure: 1, toastOnly: 0.1, closesSurface: 0.7 })).toBeCloseTo(0.7);
    expect(violation({ isOperationFailure: 0.1, toastOnly: 0.9, closesSurface: 0.9 })).toBeCloseTo(0.09);
  });

  it("聞くのは 8 件まで。残りは件数を note に書く", () => {
    const branches = Array.from({ length: 10 }, (_, index) => `  if (!result${index}.ok) { setError${index}(result${index}.reason); }`).join("\n");
    const many = build("state.failure", `function save() {\n${branches}\n}\n`, "save.ts");
    expect(many.ask).toHaveLength(8);
    expect(many.note).toContain("2 件");
  });

  it("失敗時の処理がなければ材料不足", () => {
    expect(build("state.failure", "export const A = () => <p>本文</p>;\n").insufficient).toBe(true);
  });
});
