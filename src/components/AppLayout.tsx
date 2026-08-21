
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Shield,
  Tags,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getPortfolioSummary } from "../api/portfolio";
import { formatUsd } from "../lib/format";
import { useAuthStore } from "../store/auth";
import { useLanguage, usePageCopy } from "../telegram/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { PortfolioDailyChange } from "./PortfolioDailyChange";
import { PortfolioHealthDrawer } from "./PortfolioHealthDrawer";

export function AppLayout() {
  const navigate = useNavigate();
  const language = useLanguage((state) => state.language);
  const copy = usePageCopy();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const summaryQuery = useQuery({ queryKey: ["portfolio", "summary"], queryFn: getPortfolioSummary });

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="app-stage">
      <section className="app-frame">
        <aside className="sidebar" aria-label={copy.layout.navigation}>
          <button className="round-button" type="button" aria-label={copy.layout.menu}>
            <Menu size={20} />
          </button>
          <div className="brand-mark">Pw</div>
          <nav>
            <NavLink to="/" end aria-label={copy.layout.overview}>
              <LayoutDashboard size={19} />
              <span>{copy.layout.overview}</span>
            </NavLink>
            <NavLink to="/wallets" aria-label={copy.layout.wallets}>
              <WalletCards size={19} />
              <span>{copy.layout.wallets}</span>
            </NavLink>
            <NavLink to="/groups" aria-label={copy.layout.groups}>
              <Tags size={19} />
              <span>{copy.layout.groups}</span>
            </NavLink>
            <NavLink to="/explore" aria-label={copy.layout.explore}>
              <Search size={19} />
              <span>{copy.layout.explore}</span>
            </NavLink>
            <NavLink to="/settings" aria-label={copy.layout.settings}>
              <Settings size={19} />
              <span>{copy.layout.settings}</span>
            </NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin/binance" aria-label={copy.layout.admin}>
                <Shield size={19} />
                <span>{copy.layout.admin}</span>
              </NavLink>
            ) : null}
          </nav>
          <LanguageSwitcher compact />
          <button className="round-button ghost" type="button" onClick={handleLogout} aria-label={copy.layout.logout}>
            <LogOut size={19} />
          </button>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div className="topbar-heading">
              <div className="product-title">
                <span className="product-title-icon" aria-hidden="true">
                  <WalletCards size={22} />
                </span>
                <p className="eyebrow">{copy.layout.financial}</p>
                <h1>{copy.layout.dashboard}</h1>
              </div>
              <div className="portfolio-value-cluster">
                <PortfolioDailyChange change={summaryQuery.data?.change_24h} language={language} />
                <div className="compact-portfolio-value" aria-label={copy.layout.portfolioValue}>
                  <span>{copy.layout.portfolioValue}</span>
                  <strong>{summaryQuery.data ? formatUsd(summaryQuery.data.total_usd) : "—"}</strong>
                </div>
                <PortfolioHealthDrawer
                  summary={summaryQuery.data}
                  isLoading={summaryQuery.isLoading}
                  isError={summaryQuery.isError}
                  language={language}
                />
              </div>
            </div>
            <div className="topbar-actions">
              <button className="round-button" type="button" aria-label={copy.layout.add}>
                <Plus size={20} />
              </button>
              <div className="profile-box">
                <div className="avatar">{user?.email?.slice(0, 1).toUpperCase() ?? "P"}</div>
                <div>
                  <strong title={user?.email ?? copy.layout.user}>{user?.email ?? copy.layout.user}</strong>
                  <span>{copy.layout.portfolioManager}</span>
                </div>
              </div>
              <label className="search-pill">
                <Search size={18} />
                <input aria-label={copy.layout.search} placeholder={copy.layout.searchPlaceholder} />
              </label>
              <button className="round-button" type="button" aria-label={copy.layout.notifications}>
                <Bell size={19} />
              </button>
            </div>
          </header>
          <Outlet />
        </section>
      </section>
    </main>
  );
}
