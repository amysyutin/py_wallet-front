import { CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageCopy } from "../telegram/i18n";

export function FirstWalletActivation() {
  const copy = usePageCopy();

  return (
    <article className="content-band first-wallet-activation" aria-labelledby="first-wallet-title">
      <div className="first-wallet-intro">
        <span className="first-wallet-icon" aria-hidden="true">
          <WalletCards size={30} />
        </span>
        <div>
          <p className="eyebrow">{copy.firstWalletEyebrow}</p>
          <h2 id="first-wallet-title">{copy.firstWalletTitle}</h2>
          <p>{copy.firstWalletDescription}</p>
        </div>
      </div>

      <ol className="activation-checklist">
        {copy.firstWalletSteps.map((step) => (
          <li key={step}>
            <CheckCircle2 size={19} aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="read-only-note">
        <ShieldCheck size={21} aria-hidden="true" />
        <p>
          <strong>{copy.readOnlyTitle}</strong>
          <span>{copy.readOnlyDescription}</span>
        </p>
      </div>

      <Link className="primary-button first-wallet-cta" to="wallets">
        {copy.firstWalletCta}
      </Link>
    </article>
  );
}
