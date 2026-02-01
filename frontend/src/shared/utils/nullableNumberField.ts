import type { ChangeEvent } from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

/**
 * Helpers for nullable numeric inputs used with react-hook-form.
 *
 * These utilities make it easier to work with number fields that:
 * - Allow empty values (stored as `null`)
 * - Accept both "." and "," as decimal separators
 * - Do not break form state while the user is typing
 */

/**
 * Parse a raw string from an input into a nullable number.
 *
 * Rules:
 * - Empty string ("") → null
 * - Lone decimal separator ("." or ",") → undefined (ignore change)
 * - Invalid number → undefined (ignore change)
 * - Valid number → number
 *
 * Returning `undefined` means "do not update the form value yet".
 */

export function parseNullableNumberInput(
  raw: string,
): number | null | undefined {
  if (raw === "") return null;
  const normalized = raw.replace(",", ".");

  if (normalized === ".") return undefined;

  const num = Number(normalized);
  return Number.isNaN(num) ? undefined : num;
}

/**
 * Create an `onChange` handler for a nullable number field.
 *
 * - Wraps react-hook-form `field.onChange`
 * - Applies `parseNullableNumberInput`
 * - Prevents invalid intermediate input from updating form state
 *
 * Intended usage:
 *   onChange={makeNullableNumberChangeHandler(field)}
 */

export function makeNullableNumberChangeHandler<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>(field: ControllerRenderProps<TFieldValues, TName>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseNullableNumberInput(event.target.value);
    if (parsed === undefined) return;
    field.onChange(parsed);
  };
}
