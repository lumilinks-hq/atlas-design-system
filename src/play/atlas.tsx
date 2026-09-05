import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../experiments/account-management/runs/lint-01/harness/source/styles.css";
import { App } from "../../experiments/account-management/runs/lint-01/harness/source/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
