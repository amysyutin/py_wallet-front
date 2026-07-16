import { AlertTriangle, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

function getRouteErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? "Страница не найдена" : `Ошибка ${error.status}: ${error.statusText}`;
  }

  if (error instanceof Error) return error.message;
  return "Произошла неизвестная ошибка";
}

export function RouteError() {
  const error = useRouteError();

  return (
    <main className="route-error" role="alert">
      <AlertTriangle size={34} />
      <div>
        <span>Что-то пошло не так</span>
        <h1>{getRouteErrorMessage(error)}</h1>
        <p>Можно обновить страницу или вернуться на главную.</p>
      </div>
      <div className="route-error-actions">
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={17} />
          Обновить
        </button>
        <Link className="chip" to="/">На главную</Link>
      </div>
    </main>
  );
}
