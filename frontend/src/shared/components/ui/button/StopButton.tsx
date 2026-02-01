import type { SxProps, Theme } from "@mui/material/styles";
import { BsStop } from "react-icons/bs";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Button for stopping a logger runtime.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Displays a play icon to indicate start action
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - onClick: callback invoked on button click
 * - label: optional button label (defaults to "Start")
 * - sx: optional style overrides
 */

type StopButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function StopButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Stop",
  sx,
}: StopButtonProps) {
  return (
    <AppButton
      type="button"
      variant="outlined"
      startIcon={<BsStop color="var(--color-white)" />}
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        minWidth: "13.5rem",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-light-coral)",
        "&:hover": {
          bgcolor: "var(--color-indian-red)",
        },
        ...sx,
      }}
    >
      {loading ? <LoaderMini /> : label}
    </AppButton>
  );
}
