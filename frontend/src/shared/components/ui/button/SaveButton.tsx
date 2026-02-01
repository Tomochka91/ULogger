import type { SxProps, Theme } from "@mui/material/styles";
import { BsSave } from "react-icons/bs";

import { AppButton } from "./AppButton";
import { LoaderMini } from "../loader/LoaderMini";

/**
 * Primary action button for saving forms or settings.
 *
 * - Built on top of AppButton
 * - Supports loading and disabled states
 * - Can optionally render a save icon
 * - Can expand to full width when used in form layouts
 *
 * Props:
 * - loading: shows loader and disables the button
 * - disabled: disables the button
 * - label: button label (defaults to "Save")
 * - startIcon: whether to show the save icon
 * - fullWidth: stretches button to fill available space
 * - sx: optional style overrides
 */

type SaveButtonProps = {
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  startIcon?: boolean;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

export function SaveButton({
  loading = false,
  disabled = false,
  label = "Save",
  startIcon = false,
  fullWidth = false,
  sx,
}: SaveButtonProps) {
  return (
    <AppButton
      type="submit"
      variant="contained"
      disabled={disabled || loading}
      startIcon={startIcon ? <BsSave color="var(--color-white)" /> : undefined}
      sx={{
        minWidth: "auto",
        color: "var(--color-gunmetal)",
        bgcolor: "var(--color-tropical-mint)",
        "&:hover": {
          bgcolor: "var(--color-mint)",
        },
        ...(fullWidth && { flex: 1 }),
        ...sx,
      }}
    >
      {loading ? <LoaderMini /> : label}
    </AppButton>
  );
}
