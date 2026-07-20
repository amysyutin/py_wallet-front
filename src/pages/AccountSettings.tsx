import { ChangePasswordForm } from "../components/ChangePasswordForm";

export function AccountSettings() {
  return (
    <section className="account-settings-page">
      <header>
        <p className="eyebrow">Аккаунт</p>
        <h2>Безопасность</h2>
        <p className="muted">Управляйте данными для входа в PyWallet.</p>
      </header>
      <ChangePasswordForm />
    </section>
  );
}
