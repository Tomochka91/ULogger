import { hasErrorMessage } from "../shared/utils/apiHelpers";

/**
 * Base URL of Fish Logger backend API.
 *
 * Provided via Vite environment variables to allow
 * different configurations for development, production,
 * Docker, or packaged builds.
 *
 * Example:
 * VITE_FISH_LOGGER_API_URL=http://localhost:8000
 */

export const BASE_URL = import.meta.env.VITE_FISH_LOGGER_API_URL;

/**
 * Base shape of backend API responses.
 *
 * `success` is optional to support endpoints that return
 * plain data without an explicit success flag.
 */

export type ApiBase = {
  success?: boolean;
  error?: string;
};

/**
 * Successful API response.
 *
 * - `T` represents the actual payload returned by the endpoint
 * - `success` may be omitted for simple data-only responses
 */

export type ApiSuccess<T> = ApiBase & {
  success?: true;
} & T;

/**
 * Error API response returned by backend business logic.
 */

export type ApiError = ApiBase & {
  success?: false;
};

/**
 * Unified API response type.
 *
 * Used for typing backend responses that may either
 * return data or an error.
 */

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Transport-level request error.
 *
 * This error is thrown when an HTTP request fails
 * (non-2xx status codes).
 */

export type RequestError = {
  /** HTTP status code */
  status: number;
  /** Human-readable error message */
  message: string;
  /** Raw response payload returned by backend (if any) */
  raw?: unknown;
};

/**
 * Unified HTTP request helper.
 *
 * Responsibilities:
 * - Prepends BASE_URL to all requests
 * - Adds default JSON headers
 * - Handles empty (204 No Content) responses
 * - Normalizes HTTP errors into a consistent shape
 *
 * This function should be the only way the frontend
 * communicates with the backend API.
 *
 * @param path Relative API path (e.g. "/loggers")
 * @param options Standard Fetch API options
 * @returns Parsed response body typed as TResponse
 * @throws RequestError when HTTP status is not OK
 */

export const request = async <TResponse>(
  path: string,
  options?: RequestInit
): Promise<TResponse> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  /**
   * Handle endpoints that intentionally return no content
   * (e.g. DELETE, STOP, RESET actions).
   */
  if (res.status === 204) {
    return undefined as TResponse;
  }

  /**
   * Read response as text first to safely handle empty bodies.
   */
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  /**
   * Normalize HTTP errors into a structured RequestError.
   */
  if (!res.ok) {
    throw {
      status: res.status,
      message: hasErrorMessage(data) ? data.error : `Error ${res.status}`,
      raw: data,
    } satisfies RequestError;
  }

  return data as TResponse;
};
