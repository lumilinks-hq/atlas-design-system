import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../experiments/account-management/runs/mvp-05/baseline/source/styles.css";
import { App } from "../../experiments/account-management/runs/mvp-05/baseline/source/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
