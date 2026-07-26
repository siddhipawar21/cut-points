/**
 * Lightweight error reporting for the root error boundary.
 * Logs to the console in development; swap the body of
 * reportError() for a real error-tracking service (Sentry, etc.)
 * before a production deployment if you want persisted error logs.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[Cut Points] Unhandled error:", message, {
    ...context,
    stack: error instanceof Error ? error.stack : undefined,
  });
}
