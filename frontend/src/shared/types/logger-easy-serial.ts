import type { SerialPortSettings } from "./serial-port";

/**
 * Supported field types for Easy Serial parsing.
 */
export type EasySerialFieldType = "string" | "int" | "float" | "datetime";

/**
 * Description of a single parsed field.
 *
 * - `index`: position in the incoming data
 * - `name`: field name used in parsed output
 * - `type`: expected data type
 * - `format`: optional format string (used for dates or custom parsing)
 */
export type EasySerialField = {
  index: number;
  name: string;
  type: EasySerialFieldType;
  format: string | null;
};

/**
 * Parser configuration for Easy Serial logger.
 *
 * Defines how raw serial data is split and interpreted.
 */
export type EasySerialParserSettings = {
  preamble: string | null;
  terminator: string;
  separator: string;
  encoding: string;
  fields: EasySerialField[];
};

/**
 * Full Easy Serial logger settings.
 *
 * Combines serial port configuration with parser settings.
 */
export type EasySerialSettings = {
  port: SerialPortSettings;
  parser: EasySerialParserSettings;
};

/**
 * Payload for testing Easy Serial parser with raw input text.
 */
export type EasySerialParserTest = {
  raw_text: string;
  parser_settings: EasySerialParserSettings;
};

/**
 * Result of Easy Serial parser test.
 *
 * - `parsed`: key-value map of parsed fields
 * - `error`: error message if parsing failed
 */
export type EasySerialParserTestResponse = {
  parsed: Record<string, unknown>;
  error: string | null;
};
