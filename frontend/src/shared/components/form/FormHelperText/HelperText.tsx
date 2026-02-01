import { FormHelperText, styled } from "@mui/material";

/**
 * src/shared/components/form/FormHelperText/FormHelperText.tsx
 *
 * Form helper text component.
 *
 * This module defines a styled version of MUI `FormHelperText`
 * used to display validation errors and helper messages
 * consistently across form inputs.
 *
 * Responsibilities:
 * - Provide consistent typography and spacing for helper text
 * - Reserve vertical space to prevent layout shifts
 * - Apply standardized error color from design tokens
 *
 * Design notes:
 * - Styling matches the helper text appearance used in FormInput.
 * - Implemented as a purely presentational component.
 * - Uses CSS variables to stay in sync with the global design system.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * HelperText
 *
 * Styled MUI FormHelperText component.
 *
 * Styling details:
 * - Fixed margin and minimum height to avoid layout jumping
 * - Secondary font and reduced font size for subtle appearance
 * - Error color applied by default
 *
 * Notes:
 * - Intended primarily for error messages.
 * - Can also be used for neutral helper text if color tokens are adjusted.
 */

export const HelperText = styled(FormHelperText)({
  margin: "0.2rem 0 0 0",
  fontSize: "var(--mini-font-size)",
  fontFamily: "var(--secondary-font)",
  lineHeight: "var(--line-height-standart)",
  color: "var(--color-indian-red)",
  minHeight: "0.8rem",
});
