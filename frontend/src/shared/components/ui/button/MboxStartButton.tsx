import type { SxProps, Theme } from "@mui/material/styles";
import { BsPlay } from "react-icons/bs";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Action button for sending the MBox start command.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Shows a spinner while the action is in progress
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - onClick: callback invoked on button click
 * - label: optional button label (defaults to "Start Mbox")
 * - sx: optional style overrides
 */

type MboxStartButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  sx?: SxProps<Theme>;
};

export function MboxStartButton({
  loading = false,
  disabled = false,
  onClick,
  label = "Start Mbox",
  sx,
}: MboxStartButtonProps) {
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
