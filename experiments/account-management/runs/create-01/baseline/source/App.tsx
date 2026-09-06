import { HashRouter, Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomerListPage } from "./pages/CustomerListPage";
import { readDetailScreenState, readListScreenState } from "./screenState";

function CustomerListRoute() {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("state");
  const screenState = readListScreenState(requested) ?? "default";

  return (
    // state が変わったら初期表示から作り直す
    <CustomerListPage
      key={requested ?? "default"}
      detailScreenStateRequest={readDetailScreenState(requested)}
      screenState={screenState}
    />
  );
}

function CustomerDetailRoute() {
  const { customerId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("state");

  return (
    <CustomerDetailPage
      key={`${customerId}-${requested ?? "default"}`}
      customerId={customerId}
      listScreenStateRequest={readListScreenState(requested)}
      screenState={readDetailScreenState(requested)}
    />
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/customers" element={<CustomerListRoute />} />
        <Route path="/customers/:customerId" element={<CustomerDetailRoute />} />
        <Route path="*" element={<Navigate replace to="/customers" />} />
      </Routes>
    </HashRouter>
  );
}
