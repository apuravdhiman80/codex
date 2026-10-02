import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "The page could not be loaded.";

  return (
    <div className="error-screen">
      <div className="error-panel" role="alert">
        <div className="error-icon">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>
        <p className="eyebrow">RECOVERABLE ERROR</p>
        <h1>Something went wrong</h1>
        <p>{message}</p>
        <Link className="button-primary" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Return to VisionID
        </Link>
      </div>
    </div>
  );
}
