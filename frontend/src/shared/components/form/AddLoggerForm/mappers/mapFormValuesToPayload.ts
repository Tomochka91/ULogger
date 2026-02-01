import type { Logger } from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/mappers/mapFormValuesToPayload.ts
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
 * mapFormValuesToPayload
 *
 * Converts form values into API payload.
 *
 * Logic:
 * - Pass through all form fields
 * - Normalize optional string fields:
 *   empty string → null
 *
 * Used when:
 * - creating a new logger
 * - updating an existing logger
 */

export function mapFormValuesToPayload(values: LoggerFormValues): Logger {
  return {
    ...values,
    db_user: values.db_user || null,
    db_password: values.db_password || null,
    table_name: values.table_name || null,
    query_template: values.query_template || null,
  };
}
