import { create } from "zustand";
import { getTelegramLanguage } from "./runtime";

export type AppLanguage = "ru" | "en";
const LANGUAGE_KEY = "py_wallet.language";

type LanguageState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

function initialLanguage(): AppLanguage {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "ru" || saved === "en") return saved;
  if (window.location.pathname.startsWith("/telegram")) return getTelegramLanguage();
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export const useLanguage = create<LanguageState>((set) => ({
  language: initialLanguage(),
  setLanguage: (language) => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    set({ language });
  },
}));

export const telegramCopy = {
  ru: {
    overview: "Обзор",
    wallets: "Кошельки",
    groups: "Группы",
    more: "Ещё",
    loading: "Подключаем Telegram",
    loadingHint: "Проверяем безопасные данные запуска…",
    unavailable: "Откройте PyWallet из Telegram",
    unavailableHint: "Для входа в Mini App используйте кнопку у @py_WalletBot.",
    openWebsite: "Открыть обычный сайт",
    settings: "Настройки Telegram",
    digestTitle: "Ежедневный баланс",
    digestHint: "Получайте актуальную стоимость портфеля один раз в день.",
    enable: "Разрешить и включить",
    disable: "Выключить",
    enabled: "Рассылка включена",
    disabled: "Рассылка выключена",
    delivery: "Время отправки",
    language: "Язык",
    save: "Сохранить",
    linking: "Привязать аккаунт сайта",
    linkingHint: "Введите данные существующего аккаунта pywallet.dev, чтобы объединить кошельки.",
    email: "Email",
    password: "Пароль",
    link: "Привязать",
    linked: "Аккаунт успешно привязан.",
    writeDenied: "Telegram не разрешил боту отправлять сообщения.",
  },
  en: {
    overview: "Overview",
    wallets: "Wallets",
    groups: "Groups",
    more: "More",
    loading: "Connecting Telegram",
    loadingHint: "Verifying secure launch data…",
    unavailable: "Open PyWallet from Telegram",
    unavailableHint: "Use the button in @py_WalletBot to sign in to the Mini App.",
    openWebsite: "Open the website",
    settings: "Telegram settings",
    digestTitle: "Daily balance",
    digestHint: "Receive your latest portfolio value once a day.",
    enable: "Allow and enable",
    disable: "Disable",
    enabled: "Digest is enabled",
    disabled: "Digest is disabled",
    delivery: "Delivery time",
    language: "Language",
    save: "Save",
    linking: "Link website account",
    linkingHint: "Enter your existing pywallet.dev credentials to merge your wallets.",
    email: "Email",
    password: "Password",
    link: "Link account",
    linked: "Account linked successfully.",
    writeDenied: "Telegram did not allow the bot to send messages.",
  },
} as const;

const pageCopy = {
  ru: {
    walletsTitle: "Кошельки", groupsTitle: "Группы кошельков", showArchived: "Показать архивные",
    name: "Название", noGroup: "Без группы", add: "Добавить", loadingWallets: "Загружаем кошельки",
    walletsFailed: "Не удалось загрузить кошельки", checkLive: "Проверить live", checkingLive: "Проверяем live",
    copyAddress: "Скопировать адрес", copied: "Скопировано", open: "Открыть", archive: "Архивировать",
    groupName: "Название группы", description: "Описание", create: "Создать", loadingGroups: "Загружаем группы",
    groupsFailed: "Не удалось загрузить группы", noDescription: "Без описания", deleteGroup: "Удалить группу",
    loadingWallet: "Загружаем кошелек", walletMissing: "Кошелек не найден", address: "Адрес", network: "Сеть",
    status: "Статус", liveBalance: "Live баланс", snapshotBalance: "Snapshot баланс", lastSnapshot: "Последний snapshot",
    none: "нет", fullAddress: "Полный адрес кошелька", saveNetwork: "Сохранить сеть", saving: "Сохраняем...",
    balances: "Балансы", save: "Сохранить", realBalance: "Реальный баланс", assets: "Активы",
    recentRuns: "Последние запуски", loadingPortfolio: "Загружаем портфель", portfolioFailed: "Не удалось загрузить dashboard",
    noSnapshots: "Снапшотов пока нет", noAssets: "Нет активов", noHistory: "Нет истории",
  },
  en: {
    walletsTitle: "Wallets", groupsTitle: "Wallet groups", showArchived: "Show archived",
    name: "Name", noGroup: "No group", add: "Add", loadingWallets: "Loading wallets",
    walletsFailed: "Could not load wallets", checkLive: "Check live", checkingLive: "Checking live",
    copyAddress: "Copy address", copied: "Copied", open: "Open", archive: "Archive",
    groupName: "Group name", description: "Description", create: "Create", loadingGroups: "Loading groups",
    groupsFailed: "Could not load groups", noDescription: "No description", deleteGroup: "Delete group",
    loadingWallet: "Loading wallet", walletMissing: "Wallet not found", address: "Address", network: "Network",
    status: "Status", liveBalance: "Live balance", snapshotBalance: "Snapshot balance", lastSnapshot: "Last snapshot",
    none: "none", fullAddress: "Full wallet address", saveNetwork: "Save network", saving: "Saving...",
    balances: "Balances", save: "Save", realBalance: "Live balance", assets: "Assets",
    recentRuns: "Recent runs", loadingPortfolio: "Loading portfolio", portfolioFailed: "Could not load dashboard",
    noSnapshots: "No snapshots yet", noAssets: "No assets", noHistory: "No history",
  },
} as const;

export function usePageCopy() {
  const language = useLanguage((state) => state.language);
  const isTelegram = window.location.pathname.startsWith("/telegram");
  return pageCopy[isTelegram ? language : "ru"];
}
