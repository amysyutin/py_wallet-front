import { LayoutDashboard, MoreHorizontal, Tags, WalletCards } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPortfolioSummary } from "../api/portfolio";
import { formatUsd } from "../lib/format";
import { PortfolioDailyChange } from "../components/PortfolioDailyChange";
import { PortfolioHealthDrawer } from "../components/PortfolioHealthDrawer";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuthStore } from "../store/auth";
import { telegramCopy, useLanguage, usePageCopy } from "./i18n";
import { getTelegramWebApp } from "./runtime";
import "./TelegramLayout.css";

export function TelegramLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const language = useLanguage((state) => state.language);
  const copy = telegramCopy[language];
  const pageCopy = usePageCopy();
  const summaryQuery = useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: getPortfolioSummary,
  });

  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton;
    if (!backButton) return;
    const isRoot = location.pathname === "/telegram" || location.pathname === "/telegram/";
    const handleBack = () => navigate(-1);
    if (isRoot) backButton.hide(); else backButton.show();
    backButton.onClick(handleBack);
    return () => backButton.offClick(handleBack);
  }, [location.pathname, navigate]);

  return (
    <main className="telegram-stage">
      <header className="telegram-header">
        <div className="telegram-brand">
          <span className="telegram-wallet-logo small"><WalletCards size={22} /></span>
          <div><strong>PyWallet</strong><small>{user?.email ?? pageCopy.layout.telegramUser}</small></div>
        </div>
        <LanguageSwitcher compact />
        <div className="portfolio-value-cluster">
          <PortfolioDailyChange change={summaryQuery.data?.change_24h} language={language} />
          <div className="telegram-portfolio-value" aria-label={pageCopy.layout.portfolioValue}>
            <span>{pageCopy.layout.portfolioValue}</span>
            <strong>{summaryQuery.data ? formatUsd(summaryQuery.data.total_usd) : "—"}</strong>
          </div>
          <PortfolioHealthDrawer
            summary={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
            isError={summaryQuery.isError}
            language={language}
          />
        </div>
      </header>
      <section className="telegram-workspace"><Outlet /></section>
      <nav className="telegram-bottom-nav" aria-label={pageCopy.layout.telegramNavigation}>
        <NavLink to="/telegram" end><LayoutDashboard size={21} /><span>{copy.overview}</span></NavLink>
        <NavLink to="/telegram/wallets"><WalletCards size={21} /><span>{copy.wallets}</span></NavLink>
        <NavLink to="/telegram/groups"><Tags size={21} /><span>{copy.groups}</span></NavLink>
        <NavLink to="/telegram/settings"><MoreHorizontal size={21} /><span>{copy.more}</span></NavLink>
      </nav>
    </main>
  );
}
