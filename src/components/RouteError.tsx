import { AlertTriangle, RefreshCw } from "lucide-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { usePageCopy } from "../telegram/i18n";

function getRouteErrorMessage(error: unknown, copy: ReturnType<typeof usePageCopy>) {
  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? copy.route.notFound : `${copy.route.error} ${error.status}: ${error.statusText}`;
  }

  if (error instanceof Error) return error.message;
  return copy.route.unknown;
}

export function RouteError() {
  const error = useRouteError();
  const copy = usePageCopy();

  return (
    <main className="route-error" role="alert">
      <AlertTriangle size={34} />
      <div>
        <span>{copy.route.eyebrow}</span>
        <h1>{getRouteErrorMessage(error, copy)}</h1>
        <p>{copy.route.hint}</p>
      </div>
      <div className="route-error-actions">
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={17} />
          {copy.route.refresh}
        </button>
        <Link className="chip" to="/">{copy.route.home}</Link>
      </div>
    </main>
  );
}
