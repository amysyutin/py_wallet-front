import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AdminRoute } from "../routes/AdminRoute";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { AppLayout } from "../components/AppLayout";
import { RouteError } from "../components/RouteError";
import { AdminBinance } from "../pages/AdminBinance";
import { AccountSettings } from "../pages/AccountSettings";
import { Dashboard } from "../pages/Dashboard";
import { Explore } from "../pages/Explore";
import { Groups } from "../pages/Groups";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { WalletDetail } from "../pages/WalletDetail";
import { Wallets } from "../pages/Wallets";
import { TelegramSettings } from "../pages/TelegramSettings";
import { TelegramAuth } from "../telegram/TelegramAuth";
import { TelegramLayout } from "../telegram/TelegramLayout";

const router = createBrowserRouter([
  { path: "/", element: <ProtectedRoute><AppLayout /></ProtectedRoute>, errorElement: <RouteError />, children: [{ index: true, element: <Dashboard /> }, { path: "groups", element: <Groups /> }, { path: "wallets", element: <Wallets /> }, { path: "wallets/:walletId", element: <WalletDetail /> }, { path: "explore", element: <Explore /> }, { path: "settings", element: <AccountSettings /> }, { path: "admin/binance", element: <AdminRoute><AdminBinance /></AdminRoute> }] },
  {
    path: "/telegram",
    element: <TelegramAuth><ProtectedRoute unauthenticatedTo="/telegram"><TelegramLayout /></ProtectedRoute></TelegramAuth>,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "wallets", element: <Wallets /> },
      { path: "wallets/:walletId", element: <WalletDetail /> },
      { path: "groups", element: <Groups /> },
      { path: "settings", element: <TelegramSettings /> },
    ],
  },
  { path: "/login", element: <Login />, errorElement: <RouteError /> },
  { path: "/register", element: <Register />, errorElement: <RouteError /> },
]);
export function App() { return <RouterProvider router={router} />; }
