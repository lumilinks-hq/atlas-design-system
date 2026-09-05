import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../experiments/invoice-management/runs/invoice-01/baseline/source/styles.css";
import { App } from "../../experiments/invoice-management/runs/invoice-01/baseline/source/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
