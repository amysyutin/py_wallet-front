import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { PageState } from "../components/PageState";
import { RouteError } from "../components/RouteError";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { TelegramAuth } from "../telegram/TelegramAuth";
import { TelegramLayout } from "../telegram/TelegramLayout";
import { usePageCopy } from "../telegram/i18n";
import { lazyNamedRoute } from "./lazyNamedRoute";

const accountSettingsRoute = lazyNamedRoute(
  () => import("../pages/AccountSettings"),
  "AccountSettings",
);
const adminBinanceRoute = lazyNamedRoute(
  () => import("./AdminBinanceRoute"),
  "AdminBinanceRoute",
);
const dashboardRoute = lazyNamedRoute(
  () => import("../pages/Dashboard"),
  "Dashboard",
);
const exploreRoute = lazyNamedRoute(() => import("../pages/Explore"), "Explore");
const groupsRoute = lazyNamedRoute(() => import("../pages/Groups"), "Groups");
const loginRoute = lazyNamedRoute(() => import("../pages/Login"), "Login");
const registerRoute = lazyNamedRoute(
  () => import("../pages/Register"),
  "Register",
);
const telegramSettingsRoute = lazyNamedRoute(
  () => import("../pages/TelegramSettings"),
  "TelegramSettings",
);
const walletDetailRoute = lazyNamedRoute(
  () => import("../pages/WalletDetail"),
  "WalletDetail",
);
const walletsRoute = lazyNamedRoute(() => import("../pages/Wallets"), "Wallets");

function RouteLoading() {
  const copy = usePageCopy();
  return <PageState title={copy.route.loading} />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [
      { index: true, lazy: dashboardRoute },
      { path: "groups", lazy: groupsRoute },
      { path: "wallets", lazy: walletsRoute },
      { path: "wallets/:walletId", lazy: walletDetailRoute },
      { path: "explore", lazy: exploreRoute },
      { path: "settings", lazy: accountSettingsRoute },
      { path: "admin/binance", lazy: adminBinanceRoute },
    ],
  },
  {
    path: "/telegram",
    element: (
      <TelegramAuth>
        <ProtectedRoute unauthenticatedTo="/telegram">
          <TelegramLayout />
        </ProtectedRoute>
      </TelegramAuth>
    ),
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [
      { index: true, lazy: dashboardRoute },
      { path: "wallets", lazy: walletsRoute },
      { path: "wallets/:walletId", lazy: walletDetailRoute },
      { path: "groups", lazy: groupsRoute },
      { path: "settings", lazy: telegramSettingsRoute },
    ],
  },
  {
    path: "/login",
    lazy: loginRoute,
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
  },
  {
    path: "/register",
    lazy: registerRoute,
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
