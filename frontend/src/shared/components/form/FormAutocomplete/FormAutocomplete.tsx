import { Autocomplete, autocompleteClasses, styled } from "@mui/material";

/**
 * src/shared/components/form/FormAutocomplete/FormAutocomplete.tsx
 *
 * Form Autocomplete component.
 *
 * This module defines a styled version of MUI `Autocomplete`
 * with adjusted padding and icon sizing to match other form controls.
 *
 * Responsibilities:
 * - Normalize input padding to align with FormInput
 * - Normalize popup and clear indicator appearance
 * - Apply project design tokens to Autocomplete internals
 *
 * Design notes:
 * - Implemented using MUI `styled()` API.
 * - Intended to be used together with `defaultAutocompleteSlotProps`.
 * - No logic is introduced; behavior is inherited from MUI Autocomplete.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * FormAutocomplete
 *
 * Styled MUI Autocomplete component.
 *
 * Styling details:
 * - Removes default padding from the input root
 * - Applies consistent input padding
 * - Normalizes popup and clear indicator size and color
 *
 * Notes:
 * - Icon sizes and colors are aligned with Select and Checkbox components.
 * - Slot-specific styling (paper, listbox) is handled separately
 *   via `defaultAutocompleteSlotProps`.
 */

export const FormAutocomplete = styled(Autocomplete)({
  [`& .${autocompleteClasses.inputRoot}`]: {
    padding: 0,
  },
  [`& .${autocompleteClasses.inputRoot} .MuiInputBase-input`]: {
    padding: "var(--padding-special-small) !important",
  },

  "& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator": {
    padding: "0",
  },
  "& .MuiAutocomplete-popupIndicator svg, & .MuiAutocomplete-clearIndicator svg":
    {
      fontSize: "2.8rem",
      color: "var(--color-jungle-green)",
    },
});
