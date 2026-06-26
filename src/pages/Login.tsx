import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, WalletCards } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getMe, loginUser } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { useAuthStore } from "../store/auth";
export function Login() {
  const navigate = useNavigate(); const queryClient = useQueryClient(); const token = useAuthStore((s) => s.token); const setToken = useAuthStore((s) => s.setToken); const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: loginUser, onSuccess: async (data) => { setToken(data.access_token); const user = await getMe(); setUser(user); queryClient.setQueryData(["auth", "me"], user); navigate("/", { replace: true }); } });
  if (token) return <Navigate to="/" replace />;
  function handleSubmit(event: FormEvent) { event.preventDefault(); mutation.mutate({ email, password }); }
  return <main className="auth-shell"><section className="auth-panel"><div className="brand"><WalletCards size={26} /><span>PyWallet</span></div><div><p className="eyebrow">Вход</p><h1>Кабинет криптопортфеля</h1></div><form className="form-grid" onSubmit={handleSubmit}><label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label><label>Пароль<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required minLength={8} maxLength={128} /></label>{mutation.isError ? <p className="form-error">{getErrorMessage(mutation.error)}</p> : null}<button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Входим..." : "Войти"}<ArrowRight size={18} /></button></form><p className="muted">Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p></section></main>;
}
