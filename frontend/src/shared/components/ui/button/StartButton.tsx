import type { SxProps, Theme } from "@mui/material/styles";
import { BsPlay } from "react-icons/bs";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Button for starting a logger runtime.
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

type StartButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function StartButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Start",
  sx,
}: StartButtonProps) {
  return (
    <AppButton
      type="button"
      variant="outlined"
      startIcon={<BsPlay color="var(--color-white)" />}
      disabled={disabled || loading}
      onClick={onClick}
      sx={{
        minWidth: "13.5rem",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-tropical-mint)",
        "&:hover": {
          bgcolor: "var(--color-mint)",
        },
        ...sx,
      }}
    >
      {loading ? <LoaderMini /> : label}
    </AppButton>
  );
}
