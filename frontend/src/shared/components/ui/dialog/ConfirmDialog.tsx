import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { AppButton } from "../button/AppButton";

/**
 * src/shared/components/ui/dialog/ConfirmDialog.tsx
 *
 * Generic confirmation dialog component.
 *
 * Responsibilities:
 * - Provide a reusable confirmation modal for potentially destructive actions
 * - Display an optional title and description
 * - Expose confirm/cancel actions via callbacks
 * - Support a loading state that disables interactions and updates UI copy
 *
 * Common use cases:
 * - Deleting a logger or configuration
 * - Resetting settings
 * - Any action that should require explicit user confirmation
 *
 * Behavior:
 * - Controlled via the `open` prop (the parent owns visibility state)
 * - When `loading` is true:
 *   - Buttons are disabled
 *   - Backdrop/escape close is prevented by omitting `onClose`
 *   - Confirm button text changes to a progress label ("Deleting...")
 *
 * Design notes:
 * - Built on top of MUI Dialog primitives
 * - Uses AppButton to maintain application-wide button styling
 * - Title and content typography use design-system CSS variables
 *
 * Props:
 * - open: whether the dialog is visible
 * - title: dialog title (defaults to "Are you sure")
 * - description: optional explanatory text shown under the title
 * - confirmLabel: confirm button label (defaults to "Delete")
 * - cancelLabel: cancel button label (defaults to "Cancel")
 * - loading: disables interactions and shows progress label on confirm
 * - onClose: invoked when the user cancels/closes the dialog
 * - onConfirm: invoked when the user confirms the action
 */

/* --------------------------------- Props ---------------------------------- */
type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/* ------------------------------ Component ---------------------------------- */
export function ConfirmDialog({
  open,
  title = "Are you sure",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle
        sx={{
          fontFamily: "var(--secondary-font)",
          fontSize: "var(--medium-font-size)",
          alignSelf: "center",
        }}
      >
        {title}
      </DialogTitle>

      {description && (
        <DialogContent>
          <Typography
            sx={{
              fontFamily: "var(--secondary-font)",
              fontSize: "var(--small-font-size)",
              textAlign: "center",
            }}
          >
            {description}
          </Typography>
        </DialogContent>
      )}

      <DialogActions
        sx={{
          padding: "0 0 1.6rem",
          gap: "var(--gap-mini)",
          justifyContent: "center",
        }}
      >
        <AppButton
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          sx={{ minWidth: "auto" }}
        >
          {cancelLabel}
        </AppButton>

        <AppButton
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
          sx={{
            minWidth: "auto",
            bgcolor: "var(--color-indian-red)",
            color: "white",
            "&:hover": {
              bgcolor: "var(--color-indian-red-dark, var(--color-indian-red))",
            },
          }}
        >
          {loading ? "Deleting..." : confirmLabel}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
