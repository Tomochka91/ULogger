/**
 * src/shared/utils/apiHelpers.ts
 *
 * Helper utilities for extracting and normalizing error messages
 * from API responses and thrown errors.
 *
 * Responsibilities:
 * - Safely extract validation messages from FastAPI error responses
 * - Detect generic `{ error: string }` response shapes
 * - Normalize unknown error objects into a single user-facing message
 *
 * Design notes:
 * - Functions are defensive and tolerate `unknown` inputs
 * - Intended to be used in API layers, hooks, and UI error handling
 * - Prioritizes meaningful backend messages over generic fallbacks
 */

/* ---------------------------------- Types --------------------------------- */
/**
 * FastAPI validation error item.
 * Matches FastAPI's `{ detail: [{ msg: string, ... }] }` structure.
 */

type FastApiErrorItem = { msg?: string };

/**
 * FastAPI validation error response shape.
 */

type FastApiValidationError = { detail?: FastApiErrorItem[] };

/* --------------------------- FastAPI helpers ------------------------------- */
/**
 * Extract the first validation message from a FastAPI error response.
 *
 * @param data - Raw error payload (usually `err.raw`)
 * @returns First validation message or `null` if not found
 */

export function getFirstFastApiMsg(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const detail = (data as FastApiValidationError).detail;
  if (!Array.isArray(detail) || detail.length === 0) return null;

  const msg = detail[0]?.msg;
  return typeof msg === "string" && msg.trim() ? msg : null;
}

/* ---------------------------- Type guards ---------------------------------- */
/**
 * Check whether a value has a string `error` field.
 *
 * Useful for narrowing API responses that follow `{ error: string }` convention.
 */

export function hasErrorMessage(data: unknown): data is { error: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  );
}

/* ------------------------- Error normalization ----------------------------- */
/**
 * Normalize an unknown error value into a user-facing message.
 *
 * Resolution order:
 * 1. FastAPI validation message (HTTP 422)
 * 2. Explicit `message` field on the error object
 * 3. Native Error.message
 * 4. Provided fallback string
 *
 * @param err      - Unknown error value
 * @param fallback - Fallback message if no meaningful error is found
 * @returns Normalized error message
 */

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const status = (err as { status?: unknown }).status;
    const message = (err as { message?: unknown }).message;
    const raw = (err as { raw?: unknown }).raw;

    if (status === 422) {
      const fastMsg = getFirstFastApiMsg(raw);
      if (fastMsg) return fastMsg;

      if (typeof message === "string" && message.trim()) return message;

      return "Validation error";
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
}

/**
 * Type guard for detecting fetch AbortError.
 *
 * Used to ignore user-triggered request cancellations
 * in mutation error handlers.
 */
export function isAbortError(err: unknown): err is DOMException {
  return err instanceof DOMException && err.name === "AbortError";
}
