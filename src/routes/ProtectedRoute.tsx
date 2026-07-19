import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { PageState } from "../components/PageState";
import { useAuthStore } from "../store/auth";
type ProtectedRouteProps = { children: ReactNode; unauthenticatedTo?: string };
export function ProtectedRoute({ children, unauthenticatedTo = "/login" }: ProtectedRouteProps) {
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: getMe, enabled: Boolean(token), retry: false });
  useEffect(() => { if (meQuery.data) setUser(meQuery.data); }, [meQuery.data, setUser]);
  if (!token) return <Navigate to={unauthenticatedTo} replace />;
  if (meQuery.isLoading) return <PageState title="Проверяем сессию" message="Получаем профиль пользователя." />;
  if (meQuery.isError) return <Navigate to={unauthenticatedTo} replace />;
  return children;
}
