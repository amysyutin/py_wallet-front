import { Languages } from "lucide-react";
import { useLanguage, usePageCopy } from "../telegram/i18n";

type LanguageSwitcherProps = {
  compact?: boolean;
};

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const language = useLanguage((state) => state.language);
  const setLanguage = useLanguage((state) => state.setLanguage);
  const copy = usePageCopy();

  if (compact) {
    const nextLanguage = language === "ru" ? "en" : "ru";

    return (
      <button
        className="round-button language-switcher-compact"
        type="button"
        aria-label={copy.switchToLanguage}
        title={copy.switchToLanguage}
        onClick={() => setLanguage(nextLanguage)}
      >
        <Languages size={17} aria-hidden="true" />
        <span>{language.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <div className="language-switcher" role="group" aria-label={copy.languageSelector}>
      <Languages size={17} aria-hidden="true" />
      {(["ru", "en"] as const).map((option) => (
        <button
          key={option}
          className={language === option ? "active" : ""}
          type="button"
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
