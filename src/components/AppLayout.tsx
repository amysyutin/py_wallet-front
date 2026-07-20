
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
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="app-stage">
      <section className="app-frame">
        <aside className="sidebar" aria-label="Основная навигация">
          <button className="round-button" type="button" aria-label="Меню">
            <Menu size={20} />
          </button>
          <div className="brand-mark">Pw</div>
          <nav>
            <NavLink to="/" end aria-label="Обзор">
              <LayoutDashboard size={19} />
              <span>Обзор</span>
            </NavLink>
            <NavLink to="/wallets" aria-label="Кошельки">
              <WalletCards size={19} />
              <span>Кошельки</span>
            </NavLink>
            <NavLink to="/groups" aria-label="Группы">
              <Tags size={19} />
              <span>Группы</span>
            </NavLink>
            <NavLink to="/explore" aria-label="Explore">
              <Search size={19} />
              <span>Explore</span>
            </NavLink>
            <NavLink to="/settings" aria-label="Настройки">
              <Settings size={19} />
              <span>Настройки</span>
            </NavLink>
            {user?.role === "admin" ? (
              <NavLink to="/admin/binance" aria-label="Binance">
                <Shield size={19} />
                <span>Admin</span>
              </NavLink>
            ) : null}
          </nav>
          <button className="round-button ghost" type="button" onClick={handleLogout} aria-label="Выйти">
            <LogOut size={19} />
          </button>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div className="product-title">
              <span className="product-title-icon" aria-hidden="true">
                <WalletCards size={22} />
              </span>
              <p className="eyebrow">Financial</p>
              <h1>Dashboard</h1>
            </div>
            <div className="topbar-actions">
              <button className="round-button" type="button" aria-label="Добавить">
                <Plus size={20} />
              </button>
              <div className="profile-box">
                <div className="avatar">{user?.email?.slice(0, 1).toUpperCase() ?? "P"}</div>
                <div>
                  <strong>{user?.email ?? "PyWallet user"}</strong>
                  <span>Portfolio manager</span>
                </div>
              </div>
              <label className="search-pill">
                <Search size={18} />
                <input aria-label="Поиск" placeholder="Start searching here ..." />
              </label>
              <button className="round-button" type="button" aria-label="Уведомления">
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
