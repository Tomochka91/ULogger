import type { DBaction, DBSettings } from "../shared/types";
import { request, type ApiResponse, type RequestError } from "./apiClient";

/**
 * src/apiDB.ts
 *
 * API layer for database configuration and database-related actions.
 * This module provides typed helpers for loading current DB settings
 * and performing DB actions (apply/test/save, depending on backend logic).
 *
 * Responsibilities:
 * - Fetch persisted database connection/settings from backend
 * - Submit database actions together with DB settings payload
 * - Normalize backend `ApiResponse` errors into `RequestError`
 *
 * Conventions:
 * - Backend responses are wrapped in `ApiResponse<T>`
 * - `success === false` is treated as a logical error (even with HTTP 200)
 * - Errors are thrown as `RequestError` for unified handling in UI / React Query
 *
 * Dependencies:
 * - `request<T>()` from `./apiClient`
 * - Shared types from `../shared/types`
 * - `ApiResponse` and `RequestError` from `./apiClient`
 */

/**
 * DBSettingsResponse
 * - API response shape for GET /db/settings.
 * - Backend wraps DBSettings inside `{ data: DBSettings }`.
 */

type DBSettingsResponse = ApiResponse<{ data: DBSettings }>;

/**
 * DbActionResponse
 * - API response shape for POST /db/settings actions.
 * - Does not return data on success (null payload).
 */

export type DbActionResponse = ApiResponse<null>;

/**
 * DBActionRequest
 * - Request payload for DB actions.
 *
 * @property action   - Requested DB action (from DBaction enum/union).
 * @property settings - DB settings to apply/test/save.
 */

type DBActionRequest = {
  action: DBaction;
  settings: DBSettings;
};

/* ------------------------------ Read settings ------------------------------ */
/**
 * Load current database settings from backend.
 *
 * Notes:
 * - Backend always returns HTTP 200 with `success` flag.
 * - When `success === false`, this function throws a `RequestError`
 *   to unify error handling with transport-level failures.
 *
 * @returns Promise<DBSettings> - current DB configuration.
 * @throws RequestError - when backend reports a logical error.
 * @endpoint GET /db/settings
 */

export const getDBSettings = async (): Promise<DBSettings> => {
  const data = await request<DBSettingsResponse>("/db/settings");

  if (!data.success) {
    throw {
      status: 200,
      message: data.error || "Failed to load DB settings",
      raw: data,
    } satisfies RequestError;
  }

  return data.data;
};

/* ------------------------------ DB actions --------------------------------- */
/**
 * Execute a database-related action with provided settings.
 *
 * Typical use cases (depending on backend implementation):
 * - Test DB connection
 * - Apply settings without persistence
 * - Save settings permanently
 *
 * Notes:
 * - Backend uses `success` flag to indicate logical success/failure.
 * - On failure, a `RequestError` is thrown even if HTTP status is 200.
 *
 * @param action - DB action request payload (action + settings).
 * @returns Promise<DbActionResponse> - raw ApiResponse with success/error.
 * @throws RequestError - when backend reports a logical error.
 * @endpoint POST /db/settings
 */

export const postDBSettings = async (
  action: DBActionRequest
): Promise<DbActionResponse> => {
  const data = await request<DbActionResponse>("/db/settings", {
    method: "POST",
    body: JSON.stringify(action),
  });

  if (!data.success) {
    throw {
      status: 200,
      message: data.error || "DB action failed",
      raw: data,
    } satisfies RequestError;
  }

  return data;
};
