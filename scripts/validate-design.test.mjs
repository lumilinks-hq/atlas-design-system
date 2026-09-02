// @vitest-environment node
import Ajv2020 from "ajv/dist/2020.js";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const rootDir = resolve(import.meta.dirname, "..");
const designDir = resolve(rootDir, "design");

// validate-design.mjs と同じ設定でスキーマを検証する
const ajv = new Ajv2020({ allErrors: true, strict: true });
let validateComponent;

async function readJson(path) {
  return JSON.parse(await readFile(resolve(rootDir, path), "utf8"));
}

// anatomyを持たない最小構成の契約。既存契約と同じ形。
function componentFixture(overrides = {}) {
  return {
    id: "component.fixture",
    name: "Fixture",
    implementation: "Fixture",
    import: "@heroui/react",
    variants: ["default"],
    sizes: ["md"],
    defaults: { variant: "default", size: "md" },
    visual: { surfaceOwner: "none", outerShadow: "forbidden", radiusToken: "radius.base" },
    requirements: ["構成要素の語彙を検証するためのfixture"],
    relatedRules: ["component.approved"],
    ...overrides,
  };
}

function validationErrorText(component) {
  expect(validateComponent(component)).toBe(false);
  return ajv.errorsText(validateComponent.errors, { separator: "\n" });
}

beforeAll(async () => {
  validateComponent = ajv.compile(await readJson("design/schemas/component.schema.json"));
});

describe("component契約のanatomy", () => {
  it("構成要素のimport識別子をanatomyとして受け付ける", () => {
    expect(validateComponent(componentFixture({ anatomy: ["Label", "Input"] }))).toBe(true);
  });

  it("anatomyは任意とし、持たない契約も有効とする", () => {
    expect(validateComponent(componentFixture())).toBe(true);
  });

  it("既存のすべての契約がスキーマを満たす", async () => {
    const files = (await readdir(resolve(designDir, "components"))).filter((file) => file.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const component = await readJson(`design/components/${file}`);
      expect(validateComponent(component), `${file}: ${ajv.errorsText(validateComponent.errors)}`).toBe(true);
    }
  });

  it("anatomyの重複を拒否する", () => {
    expect(validationErrorText(componentFixture({ anatomy: ["Label", "Label"] }))).toMatch(/anatomy must NOT have duplicate items/);
  });

  it("anatomyの空文字を拒否する", () => {
    expect(validationErrorText(componentFixture({ anatomy: [""] }))).toMatch(/anatomy\/0 must NOT have fewer than 1 characters/);
  });

  it("anatomyが文字列以外を拒否する", () => {
    expect(validationErrorText(componentFixture({ anatomy: [{ name: "Label" }] }))).toMatch(/anatomy\/0 must be string/);
  });
});

describe("component契約のsurfaceOwnerとnote", () => {
  it("どの契約も使っていないsurfaceOwnerのparentを拒否する", () => {
    const component = componentFixture({
      visual: { surfaceOwner: "parent", outerShadow: "forbidden", radiusToken: "radius.base" },
    });
    expect(validationErrorText(component)).toMatch(/visual\/surfaceOwner must be equal to one of the allowed values/);
  });

  it("維持理由を書き残すnoteを受け付ける", () => {
    expect(validateComponent(componentFixture({ note: "禁止判定の基準点として維持する" }))).toBe(true);
  });

  it("noteが文字列以外を拒否する", () => {
    expect(validationErrorText(componentFixture({ note: ["理由"] }))).toMatch(/note must be string/);
  });
});

describe("複合コンポーネントの構成要素", () => {
  it("TextFieldがLabel、Description、FieldError、Inputを構成要素として持つ", async () => {
    expect((await readJson("design/components/text-field.json")).anatomy).toEqual([
      "Label",
      "Description",
      "FieldError",
      "Input",
    ]);
  });

  it("SelectがListBoxを構成要素として持つ", async () => {
    expect((await readJson("design/components/select.json")).anatomy).toEqual(["ListBox"]);
  });

  it("Toastが通知を発行するtoast関数を構成要素として持つ", async () => {
    expect((await readJson("design/components/toast.json")).anatomy).toEqual(["toast"]);
  });
});

describe("FormとAlertの契約", () => {
  it("Formを承認済みコンポーネントとして定義する", async () => {
    const form = await readJson("design/components/form.json");
    expect(form.id).toBe("component.form");
    expect(form.implementation).toBe("Form");
    expect(form.import).toBe("@heroui/react");
    expect(validateComponent(form), ajv.errorsText(validateComponent.errors)).toBe(true);
  });

  it("Alertを承認済みコンポーネントとして定義する", async () => {
    const alert = await readJson("design/components/alert.json");
    expect(alert.id).toBe("component.alert");
    expect(alert.implementation).toBe("Alert");
    expect(alert.import).toBe("@heroui/react");
    expect(validateComponent(alert), ajv.errorsText(validateComponent.errors)).toBe(true);
  });

  it("顧客管理ExampleからFormとAlertを参照する", async () => {
    const example = await readJson("design/examples/account-management.json");
    expect(example.components).toContain("component.form");
    expect(example.components).toContain("component.alert");
    expect(Object.keys(example.componentUsage)).toEqual([
      "component.link",
      "component.toolbar",
      "component.alert-dialog",
      "component.table",
    ]);
  });
});
