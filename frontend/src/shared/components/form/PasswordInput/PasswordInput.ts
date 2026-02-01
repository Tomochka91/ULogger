import { styled } from "@mui/material";
import { FormInput } from "../FormInput/FormInput";

/**
 * src/shared/components/form/PasswordInput/PasswordInput.ts
 *
 * Password input component.
 *
 * This module defines a styled version of the base FormInput component
 * that supports optional masking of the input value.
 *
 * Masking is implemented using CSS (`-webkit-text-security`) rather than
 * switching input type, allowing the component to stay compatible with
 * the underlying FormInput abstraction.
 *
 * Responsibilities:
 * - Extend FormInput with password masking capability
 * - Control masking behavior via a simple boolean prop
 *
 * Design notes:
 * - The component does not introduce new logic or state.
 * - Masking is purely visual and controlled by CSS.
 * - The `masked` prop is filtered out and not forwarded to the DOM.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * PasswordInputProps
 *
 * Props extending the base FormInput behavior.
 *
 * Props:
 * - masked: enables or disables visual masking of the input value
 *
 * Notes:
 * - When `masked` is true, characters are rendered as dots.
 * - When false or omitted, the input behaves like a regular text field.
 */

type PasswordInputProps = {
  masked?: boolean;
};

/* -------------------------------- Component -------------------------------- */
/**
 * PasswordInput
 *
 * Styled FormInput component with optional password masking.
 *
 * Implementation details:
 * - Uses `styled()` from MUI to wrap FormInput
 * - Applies `-webkit-text-security` to the inner input element
 * - Filters out the `masked` prop using `shouldForwardProp`
 *
 * Usage:
 * - Suitable for password fields, tokens, secrets, or any sensitive input
 *   where toggling visibility is required.
 */

export const PasswordInput = styled(FormInput, {
  shouldForwardProp: (prop) => prop !== "masked",
})<PasswordInputProps>(({ masked }) => ({
  "& .MuiInputBase-input": {
    WebkitTextSecurity: masked ? "disc" : "none",
  },
}));
