import { RouterProvider } from "@heroui/react";
import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useHref, useNavigate } from "react-router-dom";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoiceListPage } from "./pages/InvoiceListPage";

/** HeroUIのリンクやボタンのhrefをreact-routerの遷移につなぐ。 */
function HeroUIRouterBridge({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      {children}
    </RouterProvider>
  );
}

export function App() {
  return (
    <HashRouter>
      <HeroUIRouterBridge>
        <Routes>
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="*" element={<Navigate replace to="/invoices" />} />
        </Routes>
      </HeroUIRouterBridge>
    </HashRouter>
  );
}
