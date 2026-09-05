import { Toast } from "@heroui/react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { InvoiceDetailPage } from "./InvoiceDetailPage";
import { InvoiceListPage } from "./InvoiceListPage";
import { invoiceListPath } from "./invoice-presentation";

/**
 * 埋め込みデモでも再読み込みできるよう HashRouter で一覧と詳細を別ルートに分ける。
 * 一覧と詳細を同じ画面へ同時に表示しない。
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<InvoiceListPage />} path="/invoices" />
        <Route element={<InvoiceDetailPage />} path="/invoices/:invoiceId" />
        <Route element={<Navigate replace to={invoiceListPath} />} path="*" />
      </Routes>
      <Toast.Provider />
    </HashRouter>
  );
}
