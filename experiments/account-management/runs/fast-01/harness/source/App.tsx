import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toast } from "@heroui/react";
import { CustomerListPage } from "./CustomerListPage";
import { CustomerDetailPage } from "./CustomerDetailPage";

export function App() {
  return (
    <HashRouter>
      <header className="app-header">
        <div className="page-shell app-header__inner">
          <span className="app-header__title">顧客管理</span>
        </div>
      </header>
      <Routes>
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="*" element={<Navigate replace to="/customers" />} />
      </Routes>
      <Toast.Provider />
    </HashRouter>
  );
}
