import type {
  LogsMessage,
  Logger,
  LoggerList,
  EasySerialParserTest,
  EasySerialParserTestResponse,
  LoggerStatus,
  MetricsMessage,
} from "../shared/types";
import type { MboxAvailableCounters } from "../shared/types/logger-mbox";
import { request } from "./apiClient";

/**
 * src/apiConnections.ts
 *
 * API layer for “connections” (a.k.a. loggers) and their runtime endpoints.
 * All functions are thin wrappers around `request()` from `./apiClient` and
 * return typed payloads defined in `../shared/types`.
 *
 * Responsibilities:
 * - CRUD for logger configurations (`/connections/`)
 * - Fetch runtime logs/metrics/status (`/connections/runtime/...`)
 * - Control runtime lifecycle (start/stop/restart)
 * - Easy Serial parser test endpoint
 * - MBox helpers (available counters, start-command generator/sender)
 *
 * Conventions:
 * - Every function is `async` and returns a `Promise<...>` with a concrete type.
 * - Payloads are serialized with `JSON.stringify(...)` when a body is required.
 * - Endpoint strings are kept close to the function that uses them.
 *
 * Dependencies:
 * - `request<T>(url, options?)`: typed HTTP client wrapper (handles base URL, headers, errors, etc.)
 * - Shared TypeScript types from `../shared/types` and `../shared/types/logger-mbox`
 */

/* ------------------------------ Logger CRUD -------------------------------- */
/**
 * Fetch the list of all logger configurations.
 *
 * @returns Promise<LoggerList> - array/collection of configured loggers.
 * @endpoint GET /connections/
 */

export const getLoggerList = async (): Promise<LoggerList> => {
  const data = await request<LoggerList>("/connections/");
  return data;
};

/**
 * Create a new logger configuration.
 *
 * @param payload - Full logger config object.
 * @returns Promise<Logger> - created logger (usually includes server-assigned fields like `id`).
 * @endpoint POST /connections/
 */

export const postLogger = async (payload: Logger): Promise<Logger> => {
  return await request<Logger>("/connections/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * Update an existing logger configuration by id.
 *
 * @param id - Logger id.
 * @param payload - Full logger config object (server may treat it as replacement).
 * @returns Promise<Logger> - updated logger.
 * @endpoint PUT /connections/{id}
 */

export const updateLogger = async (
  id: number,
  payload: Logger
): Promise<Logger> => {
  return await request<Logger>(`/connections/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

/**
 * Delete an existing logger configuration by id.
 *
 * @param id - Logger id.
 * @returns Promise<void>
 * @endpoint DELETE /connections/{id}
 */

export const deleteLogger = async (id: number) => {
  return await request<void>(`/connections/${id}`, {
    method: "DELETE",
  });
};

/* --------------------------- Runtime: read-only ---------------------------- */
/**
 * Fetch runtime logs for a specific logger.
 *
 * @param id - Logger id.
 * @returns Promise<LogsMessage> - log payload for UI consumption.
 * @endpoint GET /connections/runtime/{id}/logs
 */

export const getLogsMessage = async (id: number): Promise<LogsMessage> => {
  return await request<LogsMessage>(`/connections/runtime/${id}/logs`);
};

/**
 * Fetch runtime metrics for a specific logger.
 *
 * @param id - Logger id.
 * @returns Promise<MetricsMessage> - metrics payload for dashboards/graphs.
 * @endpoint GET /connections/runtime/{id}/metrics
 */

export const getMetrics = async (id: number): Promise<MetricsMessage> => {
  return await request<MetricsMessage>(`/connections/runtime/${id}/metrics`);
};

/**
 * Fetch current runtime status for a specific logger.
 *
 * @param id - Logger id.
 * @returns Promise<LoggerStatus> - status (running/stopped/error/etc.).
 * @endpoint GET /connections/runtime/{id}/status
 */

export const getLoggerStatus = async (id: number): Promise<LoggerStatus> => {
  return await request<LoggerStatus>(`/connections/runtime/${id}/status`);
};

/* -------------------------- Runtime: lifecycle ops -------------------------- */
/**
 * Start a logger runtime instance.
 *
 * @param id - Logger id.
 * @returns Promise<LoggerStatus> - updated status after start request.
 * @endpoint POST /connections/runtime/{id}/start
 */

export const startLogger = async (id: number): Promise<LoggerStatus> => {
  return await request<LoggerStatus>(`/connections/runtime/${id}/start`, {
    method: "POST",
  });
};

/**
 * Stop a logger runtime instance.
 *
 * @param id - Logger id.
 * @returns Promise<LoggerStatus> - updated status after stop request.
 * @endpoint POST /connections/runtime/{id}/stop
 */

export const stopLogger = async (id: number): Promise<LoggerStatus> => {
  return await request<LoggerStatus>(`/connections/runtime/${id}/stop`, {
    method: "POST",
  });
};

/**
 * Restart a logger runtime instance.
 *
 * @param id - Logger id.
 * @returns Promise<LoggerStatus> - updated status after restart request.
 * @endpoint POST /connections/runtime/{id}/restart
 */

export const restartLogger = async (id: number): Promise<LoggerStatus> => {
  return await request<LoggerStatus>(`/connections/runtime/${id}/restart`, {
    method: "POST",
  });
};

/* --------------------------- Easy Serial utilities -------------------------- */
/**
 * Run Easy Serial parser test on the backend (e.g., validate parser settings against sample input).
 *
 * @param payload - Parser test request (sample data + parser config, depending on shared type).
 * @returns Promise<EasySerialParserTestResponse> - parsed output / errors / debug info.
 * @endpoint POST /easy-serial/parser/test
 */

export const postEasySerialParserTest = async (
  payload: EasySerialParserTest
): Promise<EasySerialParserTestResponse> => {
  return request<EasySerialParserTestResponse>("/easy-serial/parser/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/* --------------------------------- MBox API -------------------------------- */
/**
 * Fetch list of MBox counters available to the backend (discovered/reachable).
 *
 * Note: currently logs the response to console (may be useful for debugging;
 * consider removing or gating behind dev mode for production).
 *
 * @returns Promise<MboxAvailableCounters>
 * @endpoint GET /mbox/available-counters
 */

export const getMboxAvailableCounters =
  async (): Promise<MboxAvailableCounters> => {
    const data = await request<MboxAvailableCounters>(
      "/mbox/available-counters"
    );
    console.log(data);
    return data;
  };

/**
 * Build an MBox “start” command for a logger and optionally send it immediately.
 *
 * @param id - Logger id (MBox logger).
 * @param send - If true, backend also sends the command to the device; if false, only returns it.
 * @returns Promise<string> - command string (format is defined by backend/device protocol).
 * @endpoint POST /mbox/{id}/start-command
 * @body { send: boolean }
 */

export const startMboxLogger = async (
  id: number,
  send: boolean
): Promise<string> => {
  return await request<string>(`/mbox/${id}/start-command`, {
    method: "POST",
    body: JSON.stringify({ send }),
  });
};
