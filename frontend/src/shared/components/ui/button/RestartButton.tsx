import type { SxProps, Theme } from "@mui/material/styles";
import { BsArrowClockwise } from "react-icons/bs";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Button for restarting a logger runtime.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Displays a spinner while restart is in progress
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - onClick: callback invoked on button click
 * - label: optional button label (defaults to "Restart")
 * - sx: optional style overrides
 */

type RestartButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function RestartButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Restart",
  sx,
}: RestartButtonProps) {
  return (
    <AppButton
      type="button"
      variant="outlined"
      startIcon={<BsArrowClockwise />}
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        minWidth: "13.5rem",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-vanilla)",
        "&:hover": {
          bgcolor: "var(--color-lemon-chiffon)",
        },
        ...sx,
      }}
    >
      {loading ? <LoaderMini /> : label}
    </AppButton>
  );
}
