import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { useLanguage, usePageCopy } from "../telegram/i18n";

export function AccountSettings() {
  const language = useLanguage((state) => state.language);
  const copy = usePageCopy();
  return (
    <section className="account-settings-page">
      <header>
        <p className="eyebrow">{copy.account.eyebrow}</p>
        <h2>{copy.account.title}</h2>
        <p className="muted">{copy.account.hint}</p>
      </header>
      <ChangePasswordForm language={language} />
    </section>
  );
}
