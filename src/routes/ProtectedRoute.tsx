import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { PageState } from "../components/PageState";
import { useAuthStore } from "../store/auth";
import { usePageCopy } from "../telegram/i18n";
type ProtectedRouteProps = { children: ReactNode; unauthenticatedTo?: string };
export function ProtectedRoute({ children, unauthenticatedTo = "/login" }: ProtectedRouteProps) {
  const copy = usePageCopy();
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: getMe, enabled: Boolean(token), retry: false });
  useEffect(() => { if (meQuery.data) setUser(meQuery.data); }, [meQuery.data, setUser]);
  if (!token) return <Navigate to={unauthenticatedTo} replace />;
  if (meQuery.isLoading) return <PageState title={copy.route.checkingSession} message={copy.route.loadingProfile} />;
  if (meQuery.isError) return <Navigate to={unauthenticatedTo} replace />;
  return children;
}
