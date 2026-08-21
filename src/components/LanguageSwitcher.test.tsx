import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useLanguage, usePageCopy } from "../telegram/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

function LanguageHarness() {
  const copy = usePageCopy();
  return (
    <>
      <LanguageSwitcher />
      <span>{copy.layout.dashboard}</span>
    </>
  );
}

describe("LanguageSwitcher", () => {
  beforeEach(() => useLanguage.getState().setLanguage("ru"));
  afterEach(() => useLanguage.getState().setLanguage("ru"));

  it("switches the interface to English and persists the choice", () => {
    render(<LanguageHarness />);

    expect(screen.getByText("Портфель")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "EN" }));

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("py_wallet.language")).toBe("en");
  });
});
