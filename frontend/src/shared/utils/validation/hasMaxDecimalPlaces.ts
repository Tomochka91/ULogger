/**
 * src/shared/utils/validation/hasMaxDecimalPlaces.ts
 *
 * Numeric validation helpers for limiting the number of decimal places.
 *
 * Responsibilities:
 * - Validate that a numeric value does not exceed a specified number of decimals
 * - Provide reusable helpers for common decimal limits
 * - Be tolerant to floating-point precision errors
 *
 * Design notes:
 * - Non-numeric or non-finite values return `true` to allow
 *   composition with other validation rules (e.g. required, type checks)
 * - Validation is performed by scaling the value and comparing it
 *   against the nearest integer with a small tolerance
 *
 * Floating-point handling:
 * - A tolerance value is used to avoid false negatives caused by
 *   IEEE-754 rounding errors
 */

/**
 * Check whether a value has at most `maxDecimals` decimal places.
 *
 * @param value       - Value to validate
 * @param maxDecimals - Maximum allowed number of decimal places
 * @returns `true` if valid or not a finite number, otherwise `false`
 */

export function hasMaxDecimalPlaces(
  value: unknown,
  maxDecimals: number,
): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return true;
  }

  const factor = 10 ** maxDecimals;
  const scaled = value * factor;

  const tolerance = 1e-6;

  return Math.abs(scaled - Math.round(scaled)) < tolerance;
}

/**
 * Validate that a value has at most 2 decimal places.
 */
export const hasMax2Decimals = (value: unknown) =>
  hasMaxDecimalPlaces(value, 2);

/**
 * Validate that a value has at most 3 decimal places.
 */
export const hasMax3Decimals = (value: unknown) =>
  hasMaxDecimalPlaces(value, 3);
