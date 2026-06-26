import { LayoutDashboard, LogOut, Search, Shield, Tags, WalletCards } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  function handleLogout() { logout(); navigate("/login", { replace: true }); }
  return <main className="web-shell"><aside className="sidebar"><div className="brand"><WalletCards size={24} /><span>PyWallet</span></div><nav aria-label="Основная навигация"><NavLink to="/" end><LayoutDashboard size={18} />Обзор</NavLink><NavLink to="/groups"><Tags size={18} />Группы</NavLink><NavLink to="/wallets"><WalletCards size={18} />Кошельки</NavLink><NavLink to="/explore"><Search size={18} />Explore</NavLink>{user?.role === "admin" ? <NavLink to="/admin/binance"><Shield size={18} />Binance</NavLink> : null}</nav></aside><section className="workspace"><header className="topbar"><div><p className="eyebrow">Личный кабинет</p><h1>Криптопортфель</h1></div><div className="profile-box"><span>{user?.email ?? "Аккаунт"}</span><button className="icon-button" type="button" onClick={handleLogout} aria-label="Выйти"><LogOut size={18} /></button></div></header><Outlet /></section></main>;
}
