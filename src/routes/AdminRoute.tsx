import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
type AdminRouteProps = { children: ReactNode };
export function AdminRoute({ children }: AdminRouteProps) { const user = useAuthStore((state) => state.user); return user?.role === "admin" ? children : <Navigate to="/" replace />; }
