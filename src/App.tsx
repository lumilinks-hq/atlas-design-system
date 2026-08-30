import { Navigate, Route, Routes } from "react-router-dom";
import { DocsShell } from "./components/DocsShell";
import {
  ComponentsPage,
  ExamplePage,
  FoundationsPage,
  GettingStartedPage,
  HomePage,
  PatternPage,
  RulesPage,
  SpacingPatternPage,
  TechnicalSpecsPage,
} from "./pages/DocsPages";
import { DemoPage } from "./pages/DemoPage";
import { PlayPage } from "./pages/PlayPage";

export function App() {
  return (
    <Routes>
      <Route element={<DocsShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/getting-started" element={<GettingStartedPage />} />
        <Route path="/technical-specifications" element={<TechnicalSpecsPage />} />
        <Route path="/foundations" element={<FoundationsPage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/patterns/page-layout" element={<PatternPage />} />
        <Route path="/patterns/spacing-layout" element={<SpacingPatternPage />} />
        <Route path="/patterns/account-management" element={<Navigate to="/patterns/page-layout" replace />} />
        <Route path="/examples/account-management" element={<ExamplePage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/harness" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/demo" element={<Navigate to="/demo/runs/account-management" replace />} />
      <Route path="/demo/runs/account-management" element={<DemoPage />} />
      <Route path="/play/account-management" element={<PlayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
