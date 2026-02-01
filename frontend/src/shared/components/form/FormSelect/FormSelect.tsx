import { BaseSelect } from "./BaseSelect";
import { type SelectProps } from "@mui/material";

/**
 * src/shared/components/form/FormSelect/FormSelect.tsx
 *
 * Form Select component.
 *
 * This module defines a thin wrapper around BaseSelect that:
 * - Applies consistent Menu styling (Paper + MenuList)
 * - Normalizes `value` so MUI Select behaves predictably in controlled mode
 *
 * Responsibilities:
 * - Provide a stable controlled Select even when `value` is null/undefined
 * - Apply app-wide menu styling via `MenuProps`
 * - Allow callers to extend/override MenuProps when needed
 *
 * Design notes:
 * - MUI Select expects a defined `value` for controlled usage.
 *   If `value` is `undefined` / `null`, we normalize it to an empty string.
 * - Menu styling uses CSS variables (design tokens) for consistency.
 * - `MenuProps` merging is supported, but note that this wrapper also injects
 *   `PaperProps` and `MenuListProps` styling.
 */

/* --------------------------------- Styles --------------------------------- */
/**
 * selectMenuPaperSx
 *
 * Shared styling for the dropdown menu Paper.
 *
 * Covers:
 * - spacing from select
 * - border radius / shadow
 * - border color
 * - typography base for menu
 */

const selectMenuPaperSx = {
  mt: "0.4rem",
  borderRadius: "var(--border-radius-main)",
  boxShadow: "0 0.8rem 2rem rgba(15, 30, 40, 0.18)",
  border: "1px solid var(--color-honeydew)",
  fontFamily: "var(--secondary-font)",
  fontSize: "var(--small-font-size)",
};

/**
 * selectMenuListSx
 *
 * Shared styling for the dropdown menu list and items.
 *
 * Covers:
 * - padding of the list container
 * - menu item typography
 * - hover / selected states
 */

const selectMenuListSx = {
  p: "0.4rem 0",
  "& .MuiMenuItem-root": {
    fontFamily: "var(--secondary-font)",
    fontSize: "var(--standart-font-size)",
    color: "var(--color-gunmetal)",
    "&:hover": {
      backgroundColor: "var(--color-mint-cream)",
    },
    "&.Mui-selected": {
      backgroundColor: "var(--color-mint-cream)",
    },
    "&.Mui-selected:hover": {
      backgroundColor: "var(--color-mint)",
      color: "var(--color-white)",
    },
  },
};

/* --------------------------------- Types ---------------------------------- */
/**
 * FormSelectProps
 *
 * Public props for FormSelect.
 *
 * This component is API-compatible with MUI Select (`SelectProps`).
 */

export type FormSelectProps = SelectProps;

/* -------------------------------- Component -------------------------------- */
/**
 * FormSelect
 *
 * Controlled select component with normalized `value` and themed menu styles.
 *
 * Behavior:
 * - Normalizes `value` to "" when it is null/undefined to avoid controlled/uncontrolled
 *   warnings and to keep Select stable.
 *
 * Menu styling:
 * - Injects PaperProps.sx and MenuListProps.sx with default theme values.
 * - Merges with caller-provided `MenuProps` when present.
 *
 * Notes:
 * - This component assumes that empty string value is acceptable as "no selection".
 *   If a select uses non-string values, MUI will still handle them, but callers should
 *   ensure MenuItem values align with the field type.
 */

export function FormSelect(props: FormSelectProps) {
  const { MenuProps, value, ...rest } = props;

  const safeValue = value === undefined || value === null ? "" : value;

  return (
    <BaseSelect
      {...rest}
      value={safeValue}
      MenuProps={{
        PaperProps: {
          sx: {
            ...selectMenuPaperSx,
            ...MenuProps?.sx,
          },
        },
        MenuListProps: {
          sx: {
            ...selectMenuListSx,
            ...MenuProps?.sx,
          },
        },
        ...MenuProps,
      }}
    />
  );
}
