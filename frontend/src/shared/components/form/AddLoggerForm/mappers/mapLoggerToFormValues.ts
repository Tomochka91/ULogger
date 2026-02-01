import type { Logger } from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/mappers/mapLoggerToFormValues.ts
 *
 * AddLoggerForm value mappers.
 *
 * This module contains small, focused mapping functions that:
 * - adapt form values to API payloads
 * - adapt API models back to form-friendly values
 * - extract nested settings for specialized operations (e.g. parser testing)
 *
 * General rule:
 * - Form state prefers empty strings for inputs
 * - API payload prefers nulls for optional fields
 */

/* -------------------------------- Mappers -------------------------------- */
/**
 * mapLoggerToFormValues
 *
 * Converts API logger model into form-friendly values.
 *
 * Logic:
 * - Pass through all logger fields
 * - Normalize optional fields for inputs:
 *   null → empty string
 *
 * Used when:
 * - editing an existing logger
 * - initializing form from backend data
 */

export function mapLoggerToFormValues(logger: Logger): LoggerFormValues {
  return {
    ...logger,
    db_user: logger.db_user ?? "",
    db_password: logger.db_password ?? "",
    table_name: logger.table_name ?? "",
    query_template: logger.query_template ?? "",
  };
}
