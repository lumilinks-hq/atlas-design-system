import { RouterProvider } from "@heroui/react";
import { HashRouter, Navigate, Route, Routes, useHref, useNavigate } from "react-router-dom";
import { CustomerDetailPage } from "./CustomerDetailPage";
import { CustomerListPage } from "./CustomerListPage";

function CustomerRoutes() {
  const navigate = useNavigate();

  // HeroUIのLinkを、埋め込みデモでも動くHashRouterの遷移につなぐ。
  return (
    <RouterProvider navigate={(path) => navigate(path)} useHref={useHref}>
      <Routes>
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="*" element={<Navigate replace to="/customers" />} />
      </Routes>
    </RouterProvider>
  );
}

export function App() {
  return (
    <HashRouter>
      <CustomerRoutes />
    </HashRouter>
  );
}
