import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, WalletCards } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getMe, loginUser } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuthStore } from "../store/auth";
import { usePageCopy } from "../telegram/i18n";

export function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const copy = usePageCopy();
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: async (data) => {
      setToken(data.access_token);
      const user = await getMe();
      setUser(user);
      queryClient.setQueryData(["auth", "me"], user);
      navigate("/", { replace: true });
    },
  });

  if (token) return <Navigate to="/" replace />;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <LanguageSwitcher />
        <div className="brand"><WalletCards size={26} /><span>PyWallet</span></div>
        <div><p className="eyebrow">{copy.auth.loginEyebrow}</p><h1>{copy.auth.loginTitle}</h1></div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>{copy.auth.email}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label>
          <label>{copy.auth.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required minLength={8} maxLength={128} /></label>
          {mutation.isError ? <p className="form-error">{getErrorMessage(mutation.error)}</p> : null}
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? copy.auth.loggingIn : copy.auth.login}<ArrowRight size={18} />
          </button>
        </form>
        <p className="muted">{copy.auth.noAccount} <Link to="/register">{copy.auth.registerLink}</Link></p>
      </section>
    </main>
  );
}
