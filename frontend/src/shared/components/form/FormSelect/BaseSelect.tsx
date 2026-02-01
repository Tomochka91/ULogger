import { Select, styled } from "@mui/material";

/**
 * src/shared/components/form/FormSelect/BaseSelect.tsx
 *
 * Base styled Select component.
 *
 * This module defines the visual foundation for all select inputs in the app.
 * It wraps MUI `Select` and applies the project design tokens (CSS variables)
 * to match the Fish Logger UI theme.
 *
 * Responsibilities:
 * - Provide consistent Select styling (background, radius, typography)
 * - Apply consistent outline/hover/focus behavior
 * - Style select icon and selected value container
 *
 * Design notes:
 * - Styling is implemented via MUI `styled()` API.
 * - Uses CSS variables to keep theme centralized and consistent.
 * - No runtime logic: purely presentational component.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * BaseSelect
 *
 * Styled MUI Select with project-specific theme tokens.
 *
 * Styled elements:
 * - root: background, radius, line-height
 * - outline: default/hover/focus border colors
 * - icon: color and size
 * - selected value: font, padding, alignment
 */

export const BaseSelect = styled(Select)({
  background: "var(--color-mint-cream)",
  borderRadius: "var(--border-radius-main)",
  lineHeight: "var(--line-height-standart)",

  "& .MuiInputBase-root": {
    lineHeight: "var(--line-height-standart)",
    transition: "none",
  },

  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-honeydew)",
    transition: "none",
  },

  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-mint)",
  },

  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-mint)",
    borderWidth: 1,
  },

  "& .MuiSelect-icon": {
    color: "var(--color-jungle-green)",
    fontSize: "2.8rem",
  },

  "& .MuiSelect-select": {
    fontFamily: "var(--secondary-font)",
    fontSize: "var(--standart-font-size)",
    color: "var(--color-gunmetal)",
    padding: "var(--padding-special-small)",
    display: "flex",
    alignItems: "center",
    transition: "none",
  },
});
