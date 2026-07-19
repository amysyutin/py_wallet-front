import type { TelegramThemeParams, TelegramWebApp } from "./types";

const mockInitData = import.meta.env.DEV ? import.meta.env.VITE_TELEGRAM_MOCK_INIT_DATA?.trim() : "";

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData() {
  return getTelegramWebApp()?.initData || mockInitData || "";
}

export function isTelegramMiniApp() {
  return Boolean(getTelegramWebApp()?.initData);
}

function setThemeVariables(theme: TelegramThemeParams) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(theme)) {
    if (value) root.style.setProperty(`--tg-theme-${name.replaceAll("_", "-")}`, value);
  }
  root.style.colorScheme = getTelegramWebApp()?.colorScheme ?? "light";
}

export function initializeTelegram() {
  const webApp = getTelegramWebApp();
  if (!webApp) return () => undefined;

  const applyTheme = () => {
    setThemeVariables(webApp.themeParams);
    const background = webApp.themeParams.bg_color ?? "#f7f7f6";
    webApp.setHeaderColor?.(webApp.themeParams.header_bg_color ?? background);
    webApp.setBackgroundColor?.(background);
    webApp.setBottomBarColor?.(webApp.themeParams.bottom_bar_bg_color ?? background);
  };

  applyTheme();
  webApp.onEvent("themeChanged", applyTheme);
  webApp.ready();
  webApp.expand();
  webApp.disableVerticalSwipes?.();

  return () => webApp.offEvent("themeChanged", applyTheme);
}

export function requestTelegramWriteAccess(): Promise<boolean> {
  const webApp = getTelegramWebApp();
  if (!webApp?.requestWriteAccess) return Promise.resolve(false);
  return new Promise((resolve) => webApp.requestWriteAccess?.((granted) => resolve(granted)));
}

export function getTelegramLanguage(): "ru" | "en" {
  return getTelegramWebApp()?.initDataUnsafe.user?.language_code?.toLowerCase().startsWith("ru") ? "ru" : "en";
}
