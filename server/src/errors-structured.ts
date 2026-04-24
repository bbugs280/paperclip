/**
 * Structured Error Response System
 *
 * Provides consistent, helpful error messages across the API.
 * Includes error categorization, hints, and debug information.
 */

export type ErrorCategory = "client_error" | "validation_error" | "not_found" | "conflict" | "forbidden" | "server_error";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface StructuredErrorResponse {
  error: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: Record<string, unknown>;
  hint?: string;
  debugInfo?: {
    timestamp?: string;
    requestPath?: string;
    method?: string;
  };
}

/**
 * Build structured error response
 */
export function structuredError(
  message: string,
  options: {
    code?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
  } = {},
): StructuredErrorResponse {
  return {
    error: message,
    code: options.code,
    category: options.category ?? "server_error",
    severity: options.severity ?? "error",
    details: options.details,
    hint: options.hint,
    debugInfo: {
      timestamp: new Date().toISOString(),
      requestPath: options.requestPath,
      method: options.method,
    },
  };
}

/**
 * Client error — 400
 * Used for malformed requests, invalid parameters
 */
export function clientError(
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
  } = {},
): StructuredErrorResponse {
  return structuredError(message, {
    ...options,
    category: "client_error",
    severity: "warning",
  });
}

/**
 * Validation error — 422
 * Used when data validation fails
 */
export function validationError(
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
  } = {},
): StructuredErrorResponse {
  return structuredError(message, {
    ...options,
    category: "validation_error",
    severity: "warning",
  });
}

/**
 * Not found — 404
 * Used when resource doesn't exist
 */
export function notFoundError(
  resourceType: string,
  identifier: string | { id?: string; name?: string },
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
    suggestions?: string[];
  } = {},
): StructuredErrorResponse {
  const idStr = typeof identifier === "string" ? identifier : JSON.stringify(identifier);
  const message = `${resourceType} not found: ${idStr}`;
  const hint = options.hint ?? `Check that the ${resourceType} ID or name is spelled correctly.`;
  const allSuggestions = [
    hint,
    ...(options.suggestions ?? []),
  ];

  return structuredError(message, {
    ...options,
    code: "RESOURCE_NOT_FOUND",
    category: "not_found",
    severity: "warning",
    hint: allSuggestions.join(" "),
  });
}

/**
 * Conflict — 409
 * Used when request conflicts with existing resource state
 */
export function conflictError(
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
  } = {},
): StructuredErrorResponse {
  return structuredError(message, {
    ...options,
    category: "conflict",
    severity: "warning",
  });
}

/**
 * Forbidden — 403
 * Used when request lacks permissions
 */
export function forbiddenError(
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
  } = {},
): StructuredErrorResponse {
  return structuredError(message, {
    ...options,
    code: options.code ?? "INSUFFICIENT_PERMISSIONS",
    category: "forbidden",
    severity: "warning",
  });
}

/**
 * Server error — 500
 * Used for unexpected server failures
 */
export function serverError(
  message: string,
  options: {
    code?: string;
    details?: Record<string, unknown>;
    hint?: string;
    requestPath?: string;
    method?: string;
    cause?: Error;
  } = {},
): StructuredErrorResponse {
  return structuredError(message, {
    ...options,
    code: options.code ?? "INTERNAL_ERROR",
    category: "server_error",
    severity: "critical",
  });
}

/**
 * HTTP status code for error category
 */
export function httpStatusForCategory(category: ErrorCategory): number {
  switch (category) {
    case "client_error":
      return 400;
    case "validation_error":
      return 422;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "forbidden":
      return 403;
    case "server_error":
    default:
      return 500;
  }
}
