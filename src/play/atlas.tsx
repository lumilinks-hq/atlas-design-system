import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../experiments/account-management/runs/mvp-11/harness-corrected/source/styles.css";
import { App } from "../../experiments/account-management/runs/mvp-11/harness-corrected/source/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
