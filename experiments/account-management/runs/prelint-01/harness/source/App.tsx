import { Toast } from "@heroui/react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { CustomerDetailPage } from "./CustomerDetailPage";
import { CustomerListPage } from "./CustomerListPage";
import { parseDetailScreenState, parseListScreenState } from "./screenState";

function CustomerListRoute() {
  const [searchParams] = useSearchParams();
  const stateParam = searchParams.get("state");
  const screenState = parseListScreenState(stateParam);
  return <CustomerListPage key={screenState} screenState={screenState} />;
}

function CustomerDetailRoute() {
  const { customerId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const screenState = parseDetailScreenState(searchParams.get("state"));
  return (
    <CustomerDetailPage
      customerId={customerId}
      key={`${customerId}:${screenState}`}
      screenState={screenState}
    />
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<CustomerListRoute />} path="/customers" />
        <Route element={<CustomerDetailRoute />} path="/customers/:customerId" />
        <Route element={<Navigate replace to="/customers" />} path="*" />
      </Routes>
      <Toast.Provider />
    </HashRouter>
  );
}
