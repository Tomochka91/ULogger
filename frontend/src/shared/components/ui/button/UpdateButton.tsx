import type { SxProps, Theme } from "@mui/material/styles";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Button for updating existing entities or settings.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Styled as a secondary update action
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - onClick: callback invoked on button click
 * - label: optional button label (defaults to "Update")
 * - sx: optional style overrides
 */

type UpdateButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function UpdateButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Update",
  sx,
}: UpdateButtonProps) {
  return (
    <AppButton
      type="button"
      variant="outlined"
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        fontSize: "var(--standart-font-size)",
        padding: "0.9rem 1.2rem",
        boxShadow: 0,
        border: "var(--border-standart)",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-lemon-chiffon)",
        "&:hover": {
          bgcolor: "var(--color-vanilla)",
          borderColor: "var(--color-vanilla)",
        },
        ...sx,
      }}
    >
      {loading ? <LoaderMini /> : label}
    </AppButton>
  );
}
