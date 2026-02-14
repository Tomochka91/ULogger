import type {
  EasySerialField,
  EasySerialParserSettings,
} from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/components/form/AddLoggerForm/mappers/mapParserFormToSettings.ts
 *
 * EasySerial parser value mapper.
 *
 * This module contains focused mapping logic that adapts
 * the EasySerial parser subtree from RHF form state
 * into a backend-friendly DTO (`EasySerialParserSettings`).
 *
 * Responsibilities:
 * - Convert form-friendly values (empty strings, partial numbers)
 *   into normalized API payload
 * - Enforce numeric indices for parser fields
 * - Convert empty `format` strings to `null`
 * - Guarantee structural completeness for backend contract
 *
 * Design notes:
 * - The function accepts ONLY the `easy_serial.parser` subtree,
 *   not the full `LoggerFormValues`.
 *   This improves separation of concerns and avoids unnecessary
 *   coupling to unrelated form state.
 *
 * - Form state prefers empty strings for inputs,
 *   while API prefers `null` for optional values.
 *
 * - The mapper is pure and side-effect free.
 */

/**
 * ParserForm
 *
 * Strictly typed representation of the EasySerial parser subtree
 * extracted from `LoggerFormValues`.
 *
 * We use `NonNullable` twice because:
 * - `easy_serial` may be optional in the root form
 * - `parser` may be optional inside `easy_serial`
 *
 * This guarantees that the mapper always receives
 * a concrete parser object.
 */

type ParserForm = NonNullable<
  NonNullable<LoggerFormValues["easy_serial"]>["parser"]
>;

/**
 * mapParserFormToSettings
 *
 * Maps EasySerial parser form subtree into API payload.
 *
 * Transformations:
 * - `preamble`: empty → null
 * - `format`: empty → null
 * - `index`: coerced to number
 * - Missing nested values replaced with safe defaults
 *
 * Used by:
 * - TestEasySerialParser
 * - Backend parser validation endpoint
 *
 * This function assumes the logger type is "easy_serial".
 */

export function mapParserFormToSettings(
  parser: ParserForm,
): EasySerialParserSettings {
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
