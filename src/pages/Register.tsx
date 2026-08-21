import { useMutation } from "@tanstack/react-query";
import { ArrowRight, WalletCards } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { usePageCopy } from "../telegram/i18n";

export function Register() {
  const navigate = useNavigate();
  const copy = usePageCopy();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => navigate("/login", { replace: true }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <LanguageSwitcher />
        <div className="brand"><WalletCards size={26} /><span>PyWallet</span></div>
        <div><p className="eyebrow">{copy.auth.registerEyebrow}</p><h1>{copy.auth.registerTitle}</h1></div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>{copy.auth.email}<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label>
          <label>{copy.auth.password}<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
          {mutation.isError ? <p className="form-error">{getErrorMessage(mutation.error)}</p> : null}
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? copy.auth.creating : copy.auth.create}<ArrowRight size={18} />
          </button>
        </form>
        <p className="muted">{copy.auth.hasAccount} <Link to="/login">{copy.auth.login}</Link></p>
      </section>
    </main>
  );
}
