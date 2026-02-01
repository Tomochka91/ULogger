import { Checkbox, styled } from "@mui/material";

/**
 * src/shared/components/form/FormCheckbox/FormCheckbox.tsx
 *
 * Form checkbox component.
 *
 * This module defines a styled version of MUI `Checkbox`
 * used across the application to ensure consistent
 * size, color, and spacing.
 *
 * Responsibilities:
 * - Provide a standardized checkbox appearance
 * - Apply project color tokens for checked/unchecked states
 * - Normalize icon sizing
 *
 * Design notes:
 * - Implemented as a styled MUI Checkbox.
 * - No additional logic or state is introduced.
 * - Styling relies exclusively on CSS variables (design tokens).
 */

/* -------------------------------- Component -------------------------------- */
/**
 * FormCheckbox
 *
 * Styled MUI Checkbox component.
 *
 * Styling details:
 * - Removes default padding for precise alignment in form rows
 * - Uses gunmetal color for unchecked state
 * - Uses mint color for checked state
 * - Normalizes SVG icon size to match other form controls
 *
 * Notes:
 * - Intended to be used inside FormRow or similar layout components.
 * - Does not alter checkbox behavior, only appearance.
 */

export const FormCheckbox = styled(Checkbox)({
  padding: "0",
  color: "var(--color-gunmetal)",

  "&.Mui-checked": {
    color: "var(--color-mint)",
  },

  "& svg": {
    width: "2.8rem",
    height: "2.8rem",
  },
});
