import { Navigate, Route, Routes } from "react-router-dom";
import { DocsShell } from "./components/DocsShell";
import {
  ComponentsPage,
  ExamplePage,
  FoundationsPage,
  GettingStartedPage,
  HomePage,
  PatternDocPage,
  PatternPage,
  RulesPage,
  SpacingPatternPage,
  TechnicalSpecsPage,
} from "./pages/DocsPages";
import { HarnessPage, ResultsPage } from "./pages/HarnessPages";
import { PlayPage } from "./pages/PlayPage";

const accountResultsPath = "/examples/account-management/results";

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
        <Route path="/patterns/visual-grouping" element={<PatternDocPage slug="visual-grouping" />} />
        <Route path="/patterns/mobile-layout" element={<PatternDocPage slug="mobile-layout" />} />
        <Route path="/patterns/account-management" element={<Navigate to="/patterns/page-layout" replace />} />
        <Route path="/examples/account-management" element={<ExamplePage slug="account-management" />} />
        <Route path={accountResultsPath} element={<ResultsPage experiment="account-management" />} />
        <Route path="/examples/invoice-management" element={<ExamplePage slug="invoice-management" />} />
        <Route path="/examples/invoice-management/results" element={<ResultsPage experiment="invoice-management" />} />
        <Route path="/rules" element={<RulesPage />} />
      </Route>
      <Route path="/demo" element={<Navigate to={accountResultsPath} replace />} />
      <Route path="/demo/runs/account-management" element={<Navigate to={accountResultsPath} replace />} />
      <Route path="/play/account-management" element={<PlayPage experiment="account-management" />} />
      <Route path="/play/invoice-management" element={<PlayPage experiment="invoice-management" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
