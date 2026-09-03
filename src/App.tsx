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
import { HarnessPage, ResultsPage } from "./pages/HarnessPages";
import { PlayPage } from "./pages/PlayPage";

const resultsPath = "/examples/account-management/results";

export function App() {
  return (
    <Routes>
      <Route element={<DocsShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/harness" element={<HarnessPage />} />
        <Route path="/getting-started" element={<GettingStartedPage />} />
        <Route path="/technical-specifications" element={<TechnicalSpecsPage />} />
        <Route path="/foundations" element={<FoundationsPage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/patterns/page-layout" element={<PatternPage />} />
        <Route path="/patterns/spacing-layout" element={<SpacingPatternPage />} />
        <Route path="/patterns/account-management" element={<Navigate to="/patterns/page-layout" replace />} />
        <Route path="/examples/account-management" element={<ExamplePage />} />
        <Route path={resultsPath} element={<ResultsPage />} />
        <Route path="/rules" element={<RulesPage />} />
      </Route>
      <Route path="/demo" element={<Navigate to={resultsPath} replace />} />
      <Route path="/demo/runs/account-management" element={<Navigate to={resultsPath} replace />} />
      <Route path="/play/account-management" element={<PlayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
