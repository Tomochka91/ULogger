/**
 * src/shared/components/form/FormAutocomplete/AutocompleteSlotProps.tsx
 *
 * Default Autocomplete slot props.
 *
 * This module defines shared styling configuration for MUI Autocomplete slots.
 * The exported object is intended to be passed to the `slotProps` prop
 * of the Autocomplete component.
 *
 * Responsibilities:
 * - Provide consistent dropdown (paper + listbox) styling
 * - Normalize appearance of options and "no options" state
 * - Apply project design tokens to Autocomplete internals
 *
 * Design notes:
 * - Styling is centralized to avoid duplication across Autocomplete usages.
 * - Uses CSS variables for colors, spacing, and typography.
 * - No component logic is included; this is configuration only.
 */

/* --------------------------------- Config --------------------------------- */
/**
 * defaultAutocompleteSlotProps
 *
 * Default `slotProps` configuration for MUI Autocomplete.
 *
 * Slots covered:
 * - paper: dropdown container (shadow, radius, spacing)
 * - listbox: options list and option states
 *
 * Option states:
 * - selected: mint-cream background
 * - focused: mint background with white text
 * - empty list: no border and collapsed height
 */

export const defaultAutocompleteSlotProps = {
  paper: {
    sx: {
      mt: "0.4rem",
      borderRadius: "var(--border-radius-main)",
      boxShadow: "0 0.8rem 2rem rgba(15, 30, 40, 0.18)",
      border: "none",
      overflow: "hidden",

      "& .MuiAutocomplete-noOptions": {
        fontFamily: "var(--secondary-font)",
        fontSize: "var(--standart-font-size)",
        color: "var(--color-gunmetal)",
        padding: "0.8rem 1rem",
        opacity: 0.4,
      },
    },
  },
  listbox: {
    sx: {
      p: 0,
      m: 0,
      border: "1px solid var(--color-honeydew)",
      borderRadius: "var(--border-radius-main)",

      "&:empty": {
        border: "none",
        padding: 0,
        maxHeight: 0,
      },

      "& .MuiAutocomplete-option": {
        fontFamily: "var(--secondary-font)",
        fontSize: "var(--standart-font-size)",
        color: "var(--color-gunmetal)",

        '&[aria-selected="true"]': {
          backgroundColor: "var(--color-mint-cream)",
        },
        '&[data-focus="true"]': {
          backgroundColor: "var(--color-mint)",
          color: "var(--color-white)",
        },
      },
    },
  },
};
