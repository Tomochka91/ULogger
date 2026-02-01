import type { ChangeEvent } from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

/**
 * Helpers for numeric inputs used with react-hook-form.
 *
 * These utilities are meant for number fields that:
 * - Do NOT allow `null` values
 * - Still need to handle intermediate user input safely
 * - Accept both "." and "," as decimal separators
 */

/**
 * Parse a raw string from an input into a number-friendly value.
 *
 * Rules:
 * - Empty string ("") → "" (keeps the input controlled)
 * - Lone decimal separator ("." or ",") → null (ignore change)
 * - Invalid number → null (ignore change)
 * - Valid number → number
 *
 * Returning `null` means "do not update the form value".
 */

export function parseNumberInput(raw: string): number | "" | null {
  if (raw === "") return "";
  const normalized = raw.replace(",", ".");

  if (normalized === ".") return null;

  const num = Number(normalized);
  return Number.isNaN(num) ? null : num;
}

/**
 * Create an `onChange` handler for a numeric form field.
 *
 * - Wraps react-hook-form `field.onChange`
 * - Applies `parseNumberInput`
 * - Prevents invalid or incomplete values from entering form state
 *
 * Intended usage:
 *   onChange={makeNumberChangeHandler(field)}
 */

export function makeNumberChangeHandler<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>(field: ControllerRenderProps<TFieldValues, TName>) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseNumberInput(event.target.value);
    if (parsed === null) return;
    field.onChange(parsed);
  };
}
