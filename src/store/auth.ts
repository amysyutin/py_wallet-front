import { create } from "zustand";
import type { UserRead } from "../api/types";
const TOKEN_KEY = "py_wallet.access_token";
type AuthState = { token: string | null; user: UserRead | null; setToken: (token: string) => void; setUser: (user: UserRead | null) => void; logout: () => void };
export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  setToken: (token) => { localStorage.setItem(TOKEN_KEY, token); set({ token }); },
  setUser: (user) => set({ user }),
  logout: () => { localStorage.removeItem(TOKEN_KEY); set({ token: null, user: null }); },
}));
