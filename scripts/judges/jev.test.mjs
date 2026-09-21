// @vitest-environment node
import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "../lib.mjs";
import { inventorySource } from "./evidence.mjs";
import { createJevJudge, defaultJevModel } from "./jev.mjs";

const schema = JSON.parse(await readFile(resolve(rootDir, "design", "schemas", "judgments.schema.json"), "utf8"));
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

const code = `export const App = ({ customer }) => (
  <main>
    <Button onPress={save}>保存</Button>
    <Button isIconOnly onPress={remove}><TrashIcon /></Button>
    <Drawer.Dialog>
      <Drawer.CloseTrigger />
    </Drawer.Dialog>
    <Button variant="danger">保存する</Button>
    <Link href="/customers">{customer.name}</Link>
  </main>
);
`;
const inventory = inventorySource("App.tsx", code);

// Jev に聞くのは意味の判定が要る 2 ルールだけ。danger の操作と失敗時の処理がその材料になる
const judgedCode = `export function App() {
  const save = async () => {
    try {
      await api.save();
    } catch (error) {
      toast.danger("保存できませんでした");
    }
  };
  return (
    <main>
      <Button variant="danger" onPress={save}>保存する</Button>
      <Button variant="danger" onPress={remove}>顧客を削除</Button>
    </main>
  );
}
`;
const judged = inventorySource("App.tsx", judgedCode);
const now = new Date("2026-09-19T10:00:00.000Z");

/** 質問ごとに決めた答えを返す。呼ばれた内容は calls に残す */
function fakeClient(answer, { delay = 0 } = {}) {
  const calls = [];
  let inFlight = 0;
  const client = {
    calls,
    maxInFlight: 0,
    async systemOne(request) {
      calls.push(request);
      inFlight += 1;
      client.maxInFlight = Math.max(client.maxInFlight, inFlight);
      await new Promise((done) => setTimeout(done, delay));
      inFlight -= 1;
      const answers = Object.fromEntries(Object.keys(request.questions).map((key) => [key, { type: "noul", noul: answer(request.state, key) }]));
      return { model: request.model, answers, usage: { input_tokens: 100, output_tokens: 1 } };
    },
  };
  return client;
}

const answerByLabel = (state) => (state.label === "顧客を削除" ? 0.05 : 0.9);

describe("createJevJudge", () => {
  it("聞く項目ごとに 1 回 Jev を呼び、固定したモデルを送る", async () => {
    const client = fakeClient(answerByLabel);
    await createJevJudge({ client }).judgeInventory(judged, { ruleIds: ["color.semantic"], iteration: 0, now });
    expect(defaultJevModel).toBe("jev-1.13.0");
    expect(client.calls.map((call) => call.state.label)).toEqual(["保存する", "顧客を削除"]);
    expect(client.calls.every((call) => call.model === "jev-1.13.0")).toBe(true);
    expect(Object.keys(client.calls[0].questions)).toEqual(["normalAction"]);
  });

  it("鍵の環境変数名を CLI に知らせる。鍵の値は持たない", () => {
    expect(createJevJudge({ client: fakeClient(() => 0) }).requiredEnv).toEqual(["TYPESAFE_API_KEY"]);
  });

  it("名前の判定は Jev に聞かず、コードで決めた細目だけを高い順に残す", async () => {
    const client = fakeClient(() => 1);
    const { judgments } = await createJevJudge({ client }).judgeInventory(inventory, { ruleIds: ["a11y.control-name"], iteration: 2, now });
    const [judgment] = judgments;
    expect(client.calls).toEqual([]);
    expect(judgment).toMatchObject({
      ruleId: "a11y.control-name",
      probability: 1,
      evidenceSufficient: true,
      model: "jev-1.13.0",
      judgedAt: "2026-09-19T10:00:00.000Z",
      iteration: 2,
    });
    expect(judgment.details).toEqual([
      { subject: "App.tsx:4 Button", probability: 1 },
      // aria-label のない CloseTrigger はコードで違反にする（design/components-api.md:149）
      { subject: "App.tsx:6 Drawer.CloseTrigger", probability: 1 },
      { subject: "App.tsx:3 Button「保存」", probability: 0 },
      { subject: "App.tsx:8 Button「保存する」", probability: 0 },
      { subject: "App.tsx:9 Link「{customer.name}」", probability: 0 },
    ]);
    expect(judgment.note).toContain("App.tsx:4 Button");
    expect(judgment.note).toContain("コードで 5 件、Jev で 0 件");
    expect(validate({ judge: "jev", judgments })).toBe(true);
  });

  it("聞いた細目は最大を確率にし、高い順に並べる", async () => {
    const client = fakeClient(answerByLabel);
    const { judgments } = await createJevJudge({ client }).judgeInventory(judged, { ruleIds: ["color.semantic"], iteration: 0, now });
    expect(judgments[0]).toMatchObject({ probability: 0.9, evidenceSufficient: true });
    expect(judgments[0].details).toEqual([
      { subject: "App.tsx:11 Button「保存する」", probability: 0.9 },
      { subject: "App.tsx:12 Button「顧客を削除」", probability: 0.05 },
    ]);
    expect(judgments[0].note).toContain("コードで 0 件、Jev で 2 件");
    expect(validate({ judge: "jev", judgments })).toBe(true);
  });

  it("材料がないルールは Jev に聞かず、確率を付けずに材料不足とする", async () => {
    const client = fakeClient(() => 0.5);
    const { judgments } = await createJevJudge({ client }).judgeInventory(inventory, { ruleIds: ["a11y.color-only", "state.failure"], iteration: 0, now });
    expect(client.calls).toEqual([]);
    expect(judgments.map((item) => [item.ruleId, item.evidenceSufficient, item.probability])).toEqual([
      ["a11y.color-only", false, undefined],
      ["state.failure", false, undefined],
    ]);
    expect(validate({ judge: "jev", judgments })).toBe(true);
  });

  it("聞く項目がなく違反もないルールは確率 0。builder の注意書きを note に残す", async () => {
    const plain = inventorySource("App.tsx", "export const A = () => <Button>保存</Button>;\n");
    const { judgments } = await createJevJudge({ client: fakeClient(() => 1) }).judgeInventory(plain, { ruleIds: ["color.semantic"], iteration: 0, now });
    expect(judgments[0]).toMatchObject({ ruleId: "color.semantic", probability: 0, evidenceSufficient: true, details: [] });
    expect(judgments[0].note).toContain("CSS");
  });

  it("複数の Noul の答えから細目の違反を計算する", async () => {
    const client = fakeClient((state, key) => (key === "isOperationFailure" ? 1 : key === "toastOnly" ? 0.8 : 0.1));
    const { judgments } = await createJevJudge({ client }).judgeInventory(judged, { ruleIds: ["state.failure"], iteration: 0, now });
    expect(Object.keys(client.calls[0].questions)).toEqual(["isOperationFailure", "toastOnly", "closesSurface"]);
    expect(judgments[0]).toMatchObject({ probability: 0.8, details: [{ subject: "App.tsx:5 失敗時の処理（catch）", probability: 0.8 }] });
  });

  it("同時に呼ぶのは 4 件まで。ルールをまたいでまとめて呼ぶ", async () => {
    const many = inventorySource("App.tsx", `export const A = () => (<main>${Array.from({ length: 10 }, (_, index) => `<Button variant="danger">操作${index}</Button>`).join("")}</main>);\n`);
    const client = fakeClient(() => 0.1, { delay: 5 });
    const result = await createJevJudge({ client }).judgeInventory(many, { ruleIds: ["color.semantic"], iteration: 0, now });
    expect(client.calls).toHaveLength(10);
    expect(client.maxInFlight).toBe(4);
    expect(result.usage).toEqual({ calls: 10, inputTokens: 1000, outputTokens: 10 });
  });

  it("対応していないルールは判定に入れず skipped に返す", async () => {
    const result = await createJevJudge({ client: fakeClient(() => 0) }).judgeInventory(inventory, { ruleIds: ["layout.spacing", "a11y.control-name"], iteration: 0, now });
    expect(result.judgments.map((item) => item.ruleId)).toEqual(["a11y.control-name"]);
    expect(result.skipped).toEqual(["layout.spacing"]);
  });

  it("答えが欠けていたら、推測で埋めずに止める", async () => {
    const client = { systemOne: async (request) => ({ model: request.model, answers: {}, usage: { input_tokens: 1, output_tokens: 1 } }) };
    await expect(createJevJudge({ client }).judgeInventory(judged, { ruleIds: ["color.semantic"], iteration: 0, now })).rejects.toThrow(/normalAction/);
  });

  it("応答のモデル ID を記録する。送ったものと違えばそちらを書く", async () => {
    const client = fakeClient(() => 0.1);
    const original = client.systemOne;
    client.systemOne = async (request) => ({ ...(await original(request)), model: "jev-1.13.1" });
    const { judgments } = await createJevJudge({ client }).judgeInventory(judged, { ruleIds: ["color.semantic"], iteration: 0, now });
    expect(judgments[0].model).toBe("jev-1.13.1");
  });
});
