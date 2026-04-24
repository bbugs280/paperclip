/**
 * Error Response Middleware
 *
 * Catches errors and formats them as structured responses with helpful hints.
 */

import type { Request, Response, NextFunction } from "express";
import {
  structuredError,
  notFoundError,
  forbiddenError,
  serverError,
  httpStatusForCategory,
  type StructuredErrorResponse,
} from "../errors-structured.js";

/**
 * Wrap a route handler to catch errors and return structured responses
 */
export function withStructuredErrors(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      const statusCode = getStatusCodeForError(error);
      const errorResponse = formatErrorResponse(error, req);
      res.status(statusCode).json(errorResponse);
    }
  };
}

/**
 * Format error as structured response
 */
function formatErrorResponse(error: unknown, req: Request): StructuredErrorResponse {
  if (error instanceof NotFoundError) {
    return notFoundError(error.resourceType, error.identifier, {
      requestPath: req.path,
      method: req.method,
      hint: error.hint,
      suggestions: error.suggestions,
    });
  }

  if (error instanceof ForbiddenError) {
    return forbiddenError(error.message, {
      code: error.code,
      requestPath: req.path,
      method: req.method,
      hint: error.hint,
    });
  }

  if (error instanceof ValidationError) {
    return structuredError(error.message, {
      code: error.code,
      category: "validation_error",
      severity: "warning",
      details: error.details,
      hint: error.hint,
      requestPath: req.path,
      method: req.method,
    });
  }

  if (error instanceof ApiError) {
    return structuredError(error.message, {
      code: error.code,
      category: error.category,
      severity: error.severity,
      details: error.details,
      hint: error.hint,
      requestPath: req.path,
      method: req.method,
    });
  }

  // Fallback for unknown errors
  const message = error instanceof Error ? error.message : String(error);
  return serverError(message, {
    code: "UNKNOWN_ERROR",
    requestPath: req.path,
    method: req.method,
    hint: "An unexpected error occurred. Please check the server logs for details.",
  });
}

/**
 * Get HTTP status code for error
 */
function getStatusCodeForError(error: unknown): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof ValidationError) return 422;
  if (error instanceof ApiError) return httpStatusForCategory(error.category);
  return 500;
}

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: "client_error" | "validation_error" | "not_found" | "conflict" | "forbidden" | "server_error",
    public severity: "info" | "warning" | "error" | "critical",
    public details?: Record<string, unknown>,
    public hint?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Not found error — 404
 */
export class NotFoundError extends Error {
  constructor(
    public resourceType: string,
    public identifier: string | Record<string, unknown>,
    public hint?: string,
    public suggestions?: string[],
  ) {
    super(`${resourceType} not found: ${JSON.stringify(identifier)}`);
    this.name = "NotFoundError";
  }
}

/**
 * Forbidden error — 403
 */
export class ForbiddenError extends Error {
  constructor(
    message: string,
    public code: string = "INSUFFICIENT_PERMISSIONS",
    public hint?: string,
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Validation error — 422
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>,
    public hint?: string,
    public code: string = "VALIDATION_FAILED",
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Conflict error — 409
 */
export class ConflictError extends ApiError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    hint?: string,
  ) {
    super(message, "CONFLICT", "conflict", "warning", details, hint);
    this.name = "ConflictError";
  }
}
