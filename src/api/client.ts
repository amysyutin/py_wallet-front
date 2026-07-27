
import { useAuthStore } from "../store/auth";
import { isTelegramMiniApp } from "../telegram/runtime";

type RequestOptions = RequestInit & { auth?: boolean };
type FastApiError = { detail?: string | Array<{ msg: string }> };

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

  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg).join("; ");
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (status === 400) return "Некорректный запрос к backend";
  if (status === 401) return "Неверный email/пароль или сессия истекла";
  if (status === 403) return "Недостаточно прав";
  if (status === 404) return "Ресурс не найден";
  if (status === 405) return "Метод не разрешен для этого endpoint";
  if (status === 409) return "Конфликт данных";
  if (status === 422) return "Проверьте заполнение формы";
  if (status >= 500) return "Backend вернул внутреннюю ошибку";
  return `Запрос не выполнен: HTTP ${status}`;
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
    throw new ApiError(0, "Backend недоступен. Проверьте локальный backend или Vite proxy");
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
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}
