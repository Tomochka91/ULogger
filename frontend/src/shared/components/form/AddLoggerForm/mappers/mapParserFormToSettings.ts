import type {
  EasySerialField,
  EasySerialParserSettings,
} from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/mappers/mapParserFormToSettings.ts
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
 * mapParserFormToSettings
 *
 * Extracts EasySerial parser settings from form values.
 *
 * Logic:
 * - Reads parser section from `easy_serial` config
 * - Normalizes optional fields
 * - Ensures numeric index for parser fields
 * - Converts empty format to null
 *
 * Used by:
 * - TestEasySerialParser
 * - Backend parser test endpoint
 *
 * Notes:
 * - Function is safe to call only when logger type is "easy_serial"
 * - Missing fields are replaced with sane defaults
 */

export function mapParserFormToSettings(
  values: LoggerFormValues,
): EasySerialParserSettings {
  const parser = values.easy_serial?.parser;

  return {
    preamble: parser?.preamble ?? null,
    terminator: parser?.terminator ?? "",
    separator: parser?.separator ?? "",
    encoding: parser?.encoding ?? "",
    fields: (parser?.fields ?? []).map(
      (field): EasySerialField => ({
        index: Number(field.index ?? 0),
        name: field.name ?? "",
        type: field.type,
        format: field.format || null,
      }),
    ),
  };
}
