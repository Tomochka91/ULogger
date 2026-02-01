import { TextField } from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * src/shared/components/form/FormInput/FormInput.tsx
 *
 * Base form input component.
 *
 * This module defines the visual foundation for all text-based form inputs
 * used across the application. It wraps MUI `TextField` and applies
 * project-wide design tokens for consistent appearance and behavior.
 *
 * Responsibilities:
 * - Provide consistent styling for text inputs
 * - Standardize padding, typography, colors, and focus states
 * - Define common helper text appearance
 *
 * Design notes:
 * - Implemented as a styled MUI TextField.
 * - Uses CSS variables as design tokens to keep theming centralized.
 * - Contains no form logic and no validation logic.
 * - Intended to be composed by higher-level form components.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * FormInput
 *
 * Styled MUI TextField used as the base for all input components.
 *
 * Styled elements:
 * - OutlinedInput root and input: spacing, background, border behavior
 * - Input text: font, size, color, padding
 * - Placeholder text: color and opacity
 * - Helper text: spacing, font, color, and reserved height
 *
 * Notes:
 * - Helper text height is fixed to prevent layout jumps.
 * - Focus and hover states use the same color tokens as other form controls
 *   to keep visual consistency across inputs and selects.
 */

export const FormInput = styled(TextField)({
  "& .MuiOutlinedInput-input": {
    lineHeight: "var(--line-height-standart)",
  },
  "& .MuiOutlinedInput-root": {
    lineHeight: "var(--line-height-standart)",
    padding: 0,
    paddingRight: "1.4rem",
    background: "var(--color-mint-cream)",
    borderRadius: "var(--border-radius-main)",
    "& fieldset": {
      borderColor: "var(--color-honeydew)",
    },
    "&:hover fieldset": {
      borderColor: "var(--color-mint)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "var(--color-mint)",
      borderWidth: 1,
    },
  },

  "& .MuiInputBase-input": {
    fontSize: "var(--standart-font-size)",
    fontFamily: "var(--secondary-font)",
    color: "var(--color-gunmetal)",
    padding: "var(--padding-special-small)",
  },
  "& .MuiInputBase-input::placeholder": {
    color: "var(--color-blue-munsell)",
    opacity: 0.5,
  },
  "& .MuiFormHelperText-root": {
    margin: "0.2rem 0 0 0",
    fontSize: "var(--mini-font-size)",
    fontFamily: "var(--secondary-font)",
    lineHeight: "var(--line-height-standart)",
    color: "var(--color-indian-red)",
    minHeight: "0.8rem",
  },
});
