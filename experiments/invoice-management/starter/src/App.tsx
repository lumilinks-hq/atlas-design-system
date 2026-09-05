import { HashRouter, Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { getInvoiceDetail, listInvoiceSummaries } from "./fixtures";

function InvoiceListPage() {
  return (
    <main>
      <h1>請求書一覧</h1>
      <ul>
        {listInvoiceSummaries().map((invoice) => (
          <li key={invoice.id}>
            <Link to={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  const invoice = getInvoiceDetail(invoiceId);

  if (!invoice) return <Navigate replace to="/invoices" />;

  return (
    <main>
      <Link to="/invoices">請求書一覧へ戻る</Link>
      <h1>{invoice.invoiceNumber}</h1>
      <p>brief.mdの要件に沿って、この詳細画面を実装してください。</p>
    </main>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
        <Route path="*" element={<Navigate replace to="/invoices" />} />
      </Routes>
    </HashRouter>
  );
}
