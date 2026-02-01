import { ipRegex } from "./regex";

/**
 * src/shared/utils/validation/dbFormValidation.ts
 *
 * Validation rules for the database connection form.
 *
 * Responsibilities:
 * - Centralize all validation constraints and error messages
 *   related to DB connection settings
 * - Provide a reusable validation schema compatible with
 *   react-hook-form field registration
 *
 * Design notes:
 * - Rules are defined as plain objects to be spread directly
 *   into `register(...)` calls
 * - Error messages are user-facing and ready for UI display
 * - Marked as `as const` to preserve literal types and improve
 *   type safety when consumed
 *
 * Fields:
 * - ipAddress:
 *   - Required
 *   - Must match IPv4 format (validated via `ipRegex`)
 *
 * - port:
 *   - Required
 *   - Parsed as a number
 *   - Must be an integer between 1 and 65535
 *
 * - login:
 *   - Required database username
 *
 * - password:
 *   - Required database password
 *
 * - dbName:
 *   - Required database name
 */

export const dbFormValidation = {
  ipAddress: {
    required: "IP Address is required",
    pattern: {
      value: ipRegex,
      message: "Invalid IPv4 address",
    },
  },
  port: {
    required: "Port is required",
    valueAsNumber: true,
    min: { value: 1, message: "Port must be ≥ 1" },
    max: { value: 65535, message: "Port must be ≤ 65535" },
    validate: (value: number) =>
      Number.isInteger(value) || "Only digits are allowed",
  },
  login: {
    required: "Login is required",
  },
  password: {
    required: "Password is required",
  },
  dbName: {
    required: "DataBase name is required",
  },
} as const;
