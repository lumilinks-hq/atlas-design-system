// @vitest-environment node
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "../lib.mjs";
import { inventoryRun, inventorySource } from "./evidence.mjs";

const app = `import { Alert, Button, Chip, toast } from "@heroui/react";
import { TrashIcon } from "./icons";

export function Detail({ customer, deleteError, setDeleteError }) {
  const handleDelete = () => {
    const result = remove(customer.id);
    if (!result.ok) {
      setDeleteError(result.reason);
      toast.danger("削除できませんでした");
      return;
    }
  };

  return (
    <main className="page">
      <Chip.Root variant={getStatusVariant(customer.status)}>{statusLabel(customer.status)}</Chip.Root>
      <Button variant="danger-soft" onPress={handleDelete}>顧客を削除</Button>
      <Button isIconOnly onPress={handleDelete}>
        <TrashIcon />
      </Button>
      <Button aria-label="閉じる" isDisabled />
      {deleteError ? (
        <Alert.Root status="danger">
          <Alert.Title>削除できませんでした</Alert.Title>
          <Alert.Description>{deleteError}</Alert.Description>
        </Alert.Root>
      ) : null}
    </main>
  );
}
`;

function element(inventory, component, line) {
  return inventory.elements.find((item) => item.component === component && (line === undefined || item.line === line));
}

describe("inventorySource: 部品", () => {
  const inventory = inventorySource("App.tsx", app);

  it("JSX の部品を、名前、行、props、中の文字と一緒に取り出す", () => {
    const button = element(inventory, "Button", 17);
    expect(button).toMatchObject({
      file: "App.tsx",
      line: 17,
      component: "Button",
      props: { variant: "danger-soft", onPress: "{handleDelete}" },
      text: "顧客を削除",
      literalText: "顧客を削除",
      children: [],
      parent: { component: "main", props: { className: "page" } },
    });
    expect(button.siblings.map((item) => item.component)).toEqual(["Chip.Root", "Button", "Button", "Alert.Root"]);
  });

  it("式は捨てずに {…} のまま残す。色や文字が式で決まる部品を判定できるように", () => {
    const chip = element(inventory, "Chip.Root");
    expect(chip.props.variant).toBe("{getStatusVariant(customer.status)}");
    expect(chip.text).toBe("{statusLabel(customer.status)}");
    expect(chip.literalText).toBe("");
  });

  it("値のない props は true、中が部品だけなら文字は空で、子の部品名を残す", () => {
    const iconButton = element(inventory, "Button", 18);
    expect(iconButton.props).toEqual({ isIconOnly: true, onPress: "{handleDelete}" });
    expect(iconButton.text).toBe("");
    expect(iconButton.children).toEqual(["TrashIcon"]);
  });

  it("入れ子の部品の文字は親にもまとめる", () => {
    expect(element(inventory, "Alert.Root").text).toBe("削除できませんでした {deleteError}");
    expect(element(inventory, "Alert.Root").literalText).toBe("削除できませんでした");
  });

  it("小文字のタグも取り出す", () => {
    expect(element(inventory, "main").props).toEqual({ className: "page" });
  });

  it("props の式は空白をまとめ、長ければ切る", () => {
    const body = "x".repeat(300);
    const code = `const A = () => <Select onChange={(value) => {\n  update("${body}", value);\n}} />;\n`;
    const value = inventorySource("A.tsx", code).elements[0].props.onChange;
    expect(value.startsWith('{(value) => { update("xxx')).toBe(true);
    expect(value.length).toBeLessThan(210);
  });

  it("条件式や && の結果になる文字も literalText に入れる。比較や props の文字は入れない", () => {
    const code = `export const Save = ({ isSaving, status }) => (
  <>
    <Button>{isSaving ? "保存中" : "保存"}</Button>
    <Button>{isSaving ? (<><Spinner size="sm" /> 削除中…</>) : ("削除する")}</Button>
    <Button>{status === "active" ? <PauseIcon /> : <PlayIcon />}</Button>
    <Button>{isSaving && \`\${count}件を保存中\`}</Button>
  </>
);
`;
    const buttons = inventorySource("Save.tsx", code).elements.filter((item) => item.component === "Button");
    expect(buttons.map((item) => item.literalText)).toEqual(["保存中 保存", "削除中… 削除する", "", "件を保存中"]);
  });

  it("親の部品と、兄弟の部品の文字を添える。Select.Trigger の名前が Label から付くかを判定できるように", () => {
    const code = `export const Status = () => (
  <Select aria-label="状態">
    <Label>ステータス</Label>
    <Select.Trigger><Select.Value /></Select.Trigger>
  </Select>
);
`;
    const trigger = inventorySource("Status.tsx", code).elements.find((item) => item.component === "Select.Trigger");
    expect(trigger.parent).toEqual({ component: "Select", props: { "aria-label": "状態" } });
    expect(trigger.siblings).toEqual([{ component: "Label", literalText: "ステータス" }]);
    expect(element(inventory, "main").parent).toBeNull();
  });

  it("ダイアログの Body の中の部品には、同じダイアログの Footer にあるボタンを添える。再試行の操作が Footer にあることが多いので", () => {
    const code = `export const Delete = ({ errorReason, isDeleting }) => (
  <AlertDialog.Dialog>
    <AlertDialog.Body>
      <p>元に戻せません。</p>
      {errorReason ? (
        <Alert status="danger">
          <Alert.Title>削除できませんでした</Alert.Title>
          <Alert.Description>{errorReason}</Alert.Description>
        </Alert>
      ) : null}
    </AlertDialog.Body>
    <AlertDialog.Footer>
      <Button onPress={close}>キャンセル</Button>
      <Button onPress={runDelete}>{isDeleting ? "削除中" : errorReason ? "再試行" : "削除する"}</Button>
    </AlertDialog.Footer>
  </AlertDialog.Dialog>
);
`;
    const elements = inventorySource("Delete.tsx", code).elements;
    const alert = elements.find((item) => item.component === "Alert");
    expect(alert.footer).toEqual([
      { component: "Button", literalText: "キャンセル" },
      { component: "Button", literalText: "削除中 再試行 削除する" },
    ]);
    // 入れ子の部品も同じ Footer を持つ
    expect(elements.find((item) => item.component === "Alert.Title").footer).toHaveLength(2);
    // Body の外の部品には付けない
    expect(elements.find((item) => item.component === "AlertDialog.Footer")).not.toHaveProperty("footer");
    expect(element(inventory, "Alert.Root")).not.toHaveProperty("footer");
  });
});

describe("inventorySource: 文字列", () => {
  const inventory = inventorySource("App.tsx", app);

  it("文字列と JSX の文字を行と一緒に取り出す。import のパスは除く", () => {
    const values = inventory.strings.map((item) => item.value);
    expect(values).toContain("削除できませんでした");
    expect(values).toContain("顧客を削除");
    expect(values).not.toContain("@heroui/react");
    expect(values).not.toContain("./icons");
    expect(inventory.strings.find((item) => item.value === "顧客を削除")).toEqual({ file: "App.tsx", line: 17, value: "顧客を削除" });
  });

  it("同じ通知で一緒に出す文字を shownWith に添える。文言を並べただけの辞書には添えない", () => {
    const code = `const failure = { tone: "danger", title: "更新できませんでした", description: "入力内容を保持したまま再試行できます。" };
toast.error("削除できませんでした", { description: \`もう一度お試しください\` });
const messages = { required: "会社名を入力してください", email: "形式が正しくありません" };
`;
    const { strings } = inventorySource("App.ts", code);
    const find = (value) => strings.find((item) => item.value === value);

    expect(find("更新できませんでした").shownWith).toEqual({ description: "入力内容を保持したまま再試行できます。" });
    expect(find("入力内容を保持したまま再試行できます。").shownWith).toEqual({ title: "更新できませんでした" });
    expect(find("削除できませんでした").shownWith).toEqual({ description: "もう一度お試しください" });
    expect(find("会社名を入力してください")).not.toHaveProperty("shownWith");
    expect(find("danger")).not.toHaveProperty("shownWith");
  });
});

describe("inventorySource: 失敗時の処理", () => {
  const inventory = inventorySource("App.tsx", app);

  it("結果が ok でない分岐を取り出し、そこで呼ぶ setter の値を表示している JSX を添える", () => {
    expect(inventory.failureHandlers).toHaveLength(1);
    const [handler] = inventory.failureHandlers;
    expect(handler).toMatchObject({ file: "App.tsx", line: 7, kind: "if" });
    expect(handler.code).toContain("setDeleteError(result.reason)");
    expect(handler.code).toContain('toast.danger("削除できませんでした")');
    expect(handler.rendering).toHaveLength(1);
    expect(handler.rendering[0]).toContain("<Alert.Root status=\"danger\">");
  });

  it("何も呼ばない分岐は、表示の切り替えなので失敗時の処理に入れない", () => {
    const code = `function tone(screenState) {
  if (screenState === "failure") return "error";
  return "default";
}
`;
    expect(inventorySource("tone.ts", code).failureHandlers).toEqual([]);
  });

  it("表示を探す state は、true/false だけを入れるフラグより、エラーの文言を入れるものを先にする", () => {
    const code = `export function Edit() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const save = () => {
    if (!result.ok) {
      setIsSaving(false);
      setSaveError(result.reason);
    }
  };
  return (
    <Drawer>
      <Drawer.CloseTrigger isDisabled={isSaving} />
      <Button isDisabled={isSaving}>保存</Button>
      <Input isDisabled={isSaving} />
      {saveError ? <Alert status="danger">{saveError}</Alert> : null}
    </Drawer>
  );
}
`;
    const [handler] = inventorySource("Edit.tsx", code).failureHandlers;
    expect(handler.rendering).toEqual(['{saveError ? <Alert status="danger">{saveError}</Alert> : null}']);
  });

  it("catch と .catch も失敗時の処理として取り出す", () => {
    const code = `async function save() {
  try {
    await api.save();
  } catch (error) {
    toast.danger("保存できませんでした");
  }
  load().catch(() => setLoadError("読み込めませんでした"));
}
`;
    const handlers = inventorySource("save.ts", code).failureHandlers;
    expect(handlers.map((item) => [item.kind, item.line])).toEqual([
      ["catch", 4],
      ["catch-callback", 7],
    ]);
  });
});

describe("inventoryRun", () => {
  it("保存済み Run の source からテスト以外のファイルを読む", async () => {
    const inventory = await inventoryRun(resolve(rootDir, "experiments/account-management/runs/mvp-11/harness/source"));
    const files = new Set(inventory.elements.map((item) => item.file));
    expect(files.has("App.tsx")).toBe(true);
    expect(files.has("App.test.tsx")).toBe(false);
    // 検索欄の消去ボタンには aria-label がある
    const clear = inventory.elements.find((item) => item.component === "SearchField.ClearButton");
    expect(clear.props["aria-label"]).toBe("検索条件をクリア");
    // 保存と削除の失敗は if (!result.ok) で扱っている
    expect(inventory.failureHandlers.filter((item) => item.code.includes("result.ok")).length).toBeGreaterThanOrEqual(2);
  });
});
