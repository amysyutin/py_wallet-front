
import { useAuthStore } from "../store/auth";
import { useLanguage } from "../telegram/i18n";
import { isTelegramMiniApp } from "../telegram/runtime";

type RequestOptions = RequestInit & { auth?: boolean };
type FastApiError = { detail?: string | Array<{ msg: string }> };

const apiCopy = {
  ru: {
    badRequest: "Некорректный запрос к backend",
    unauthorized: "Неверный email/пароль или сессия истекла",
    forbidden: "Недостаточно прав",
    notFound: "Ресурс не найден",
    methodNotAllowed: "Метод не разрешён для этого endpoint",
    conflict: "Конфликт данных",
    validation: "Проверьте заполнение формы",
    server: "Backend вернул внутреннюю ошибку",
    requestFailed: "Запрос не выполнен",
    unavailable: "Backend недоступен. Проверьте локальный backend или Vite proxy",
    unknown: "Неизвестная ошибка",
  },
  en: {
    badRequest: "Invalid backend request",
    unauthorized: "Invalid email/password or the session has expired",
    forbidden: "Insufficient permissions",
    notFound: "Resource not found",
    methodNotAllowed: "Method is not allowed for this endpoint",
    conflict: "Data conflict",
    validation: "Check the form fields",
    server: "The backend returned an internal error",
    requestFailed: "Request failed",
    unavailable: "Backend unavailable. Check the local backend or Vite proxy",
    unknown: "Unknown error",
  },
} as const;

function currentCopy() {
  return apiCopy[useLanguage.getState().language];
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function parseError(status: number, payload: unknown) {
  const data = payload as FastApiError;
  const copy = currentCopy();

  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg).join("; ");
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (status === 400) return copy.badRequest;
  if (status === 401) return copy.unauthorized;
  if (status === 403) return copy.forbidden;
  if (status === 404) return copy.notFound;
  if (status === 405) return copy.methodNotAllowed;
  if (status === 409) return copy.conflict;
  if (status === 422) return copy.validation;
  if (status >= 500) return copy.server;
  return `${copy.requestFailed}: HTTP ${status}`;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("X-Client-Channel")) {
    headers.set("X-Client-Channel", isTelegramMiniApp() ? "telegram" : "web");
  }
  if (options.auth !== false && token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, currentCopy().unavailable);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) logout();
    throw new ApiError(response.status, parseError(response.status, payload));
  }

  return payload as T;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : currentCopy().unknown;
}
