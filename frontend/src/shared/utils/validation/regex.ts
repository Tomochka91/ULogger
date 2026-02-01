/**
 * src/shared/utils/validation/regex.ts
 *
 * Collection of reusable regular expressions for validation.
 *
 * Responsibilities:
 * - Centralize commonly used validation regex patterns
 * - Avoid duplication of complex regular expressions across the codebase
 * - Provide readable, named exports for form validation utilities
 *
 * ipRegex:
 * - Validates an IPv4 address in dotted-decimal notation
 * - Ensures each octet is within the valid range (0–255)
 * - Rejects invalid formats such as missing octets or out-of-range values
 *
 * Usage:
 * - Intended to be used with form validation libraries
 *   (e.g. react-hook-form `pattern` rule)
 */

export const ipRegex =
  /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])$/;
