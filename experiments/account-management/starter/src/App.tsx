import { HashRouter, Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { getCustomerDetail, listCustomerSummaries } from "./fixtures";

function CustomerListPage() {
  return (
    <main>
      <h1>顧客一覧</h1>
      <ul>
        {listCustomerSummaries().map((customer) => (
          <li key={customer.id}>
            <Link to={`/customers/${customer.id}`}>{customer.companyName}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const customer = getCustomerDetail(customerId);

  if (!customer) return <Navigate replace to="/customers" />;

  return (
    <main>
      <Link to="/customers">顧客一覧へ戻る</Link>
      <h1>{customer.companyName}</h1>
      <p>brief.mdの要件に沿って、この詳細画面を実装してください。</p>
    </main>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="*" element={<Navigate replace to="/customers" />} />
      </Routes>
    </HashRouter>
  );
}
