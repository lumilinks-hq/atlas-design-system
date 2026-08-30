import { describe, expect, it } from "vitest";
import { evaluateSource } from "./evaluate-experiment.mjs";

describe("evaluateSource", () => {
  it("detects design contract escapes", () => {
    const rules = evaluateSource({
      app: '<button>保存</button><div role="dialog">確認</div>',
      styles: ".panel { color: #123456; }",
    });
    const byId = new Map(rules.map((rule) => [rule.id, rule]));

    expect(byId.get("component.approved")?.status).toBe("failed");
    expect(byId.get("token.no-raw-color")?.evidence).toEqual(["raw color: 1件"]);
    expect(byId.get("action.confirmation")?.status).toBe("failed");
    expect(byId.get("a11y.focus-management")?.status).toBe("failed");
  });

  it("requires the AlertDialog trigger contract", () => {
    const withoutTrigger = evaluateSource({
      app: "<AlertDialog.Root><AlertDialog.Dialog /></AlertDialog.Root>",
      styles: "",
    });
    const withTrigger = evaluateSource({
      app: "<AlertDialog.Root><AlertDialog.Trigger><Button>確認</Button></AlertDialog.Trigger><AlertDialog.Dialog /></AlertDialog.Root>",
      styles: "",
    });

    expect(withoutTrigger.find((rule) => rule.id === "action.confirmation")?.status).toBe("failed");
    expect(withTrigger.find((rule) => rule.id === "action.confirmation")?.status).toBe("passed");
  });

  it("requires the Drawer trigger contract", () => {
    const withoutTrigger = evaluateSource({
      app: "<Drawer.Root><Drawer.Backdrop /></Drawer.Root>",
      styles: "",
    });
    const withTrigger = evaluateSource({
      app: '<Drawer.Root><Drawer.Trigger className="button button--primary">開く</Drawer.Trigger><Drawer.Backdrop /></Drawer.Root>',
      styles: "",
    });

    expect(withoutTrigger.find((rule) => rule.id === "a11y.focus-management")?.status).toBe("failed");
    expect(withTrigger.find((rule) => rule.id === "a11y.focus-management")?.status).toBe("passed");
  });
});
