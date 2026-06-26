import { useMutation } from "@tanstack/react-query";
import { ArrowRight, WalletCards } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import { getErrorMessage } from "../api/client";
export function Register() {
  const navigate = useNavigate(); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const mutation = useMutation({ mutationFn: registerUser, onSuccess: () => navigate("/login", { replace: true }) });
  function handleSubmit(event: FormEvent) { event.preventDefault(); mutation.mutate({ email, password }); }
  return <main className="auth-shell"><section className="auth-panel"><div className="brand"><WalletCards size={26} /><span>PyWallet</span></div><div><p className="eyebrow">Регистрация</p><h1>Создать аккаунт</h1></div><form className="form-grid" onSubmit={handleSubmit}><label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required /></label><label>Пароль<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>{mutation.isError ? <p className="form-error">{getErrorMessage(mutation.error)}</p> : null}<button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Создаем..." : "Создать"}<ArrowRight size={18} /></button></form><p className="muted">Уже есть аккаунт? <Link to="/login">Войти</Link></p></section></main>;
}
