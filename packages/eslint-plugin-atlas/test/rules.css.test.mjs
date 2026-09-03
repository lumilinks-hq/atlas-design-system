import { cssTester } from "./setup.mjs";
import { rules } from "../src/index.mjs";

cssTester.run("no-raw-color", rules["no-raw-color"], {
  valid: [{ code: `a { color: var(--dh-text); }` }],
  invalid: [
    { code: `a { color: #fff; }`, errors: [{ messageId: "rawColor", data: { value: "#fff" } }] },
    { code: `a { color: rgba(0, 0, 0, 0.5); background: hsl(0 0% 0%); }`, errors: [{ messageId: "rawColor" }, { messageId: "rawColor" }] },
  ],
});

cssTester.run("component-theme-import", rules["component-theme-import"], {
  valid: [{ code: `@import "../design/component-theme.css";`, options: [{ path: "design/component-theme.css" }] }],
  invalid: [{ code: `@import "tailwindcss";`, options: [{ path: "design/component-theme.css" }], errors: [{ messageId: "missing" }] }],
});
