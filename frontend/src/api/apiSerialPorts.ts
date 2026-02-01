import type { SerialPort } from "../shared/types";
import { request } from "./apiClient";

/**
 * src/api/apiSerialPorts.ts
 *
 * API layer for serial port discovery.
 * Provides a typed helper to fetch the list of serial ports
 * available on the host system as reported by the backend.
 *
 * Responsibilities:
 * - Query backend for currently available serial ports
 * - Return a typed list suitable for UI selectors/forms
 *
 * Conventions:
 * - Thin wrapper around `request()` from `./apiClient`
 * - No additional error normalization; transport errors
 *   are handled by the request layer
 *
 * Dependencies:
 * - `request<T>()` from `./apiClient`
 * - `SerialPort` type from `../shared/types`
 */

/* --------------------------- Serial port listing --------------------------- */
/**
 * Fetch all serial ports currently available on the system.
 *
 * @returns Promise<SerialPort[]> - list of detected serial ports.
 * @endpoint GET /serial-ports/available
 */

export const getSerialPorts = async (): Promise<SerialPort[]> => {
  const data = await request<SerialPort[]>("/serial-ports/available");
  return data;
};
