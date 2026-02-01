import React from "react";

import { Box, Typography } from "@mui/material";

/**
 * src/shared/components/form/formRow/FormRow.tsx
 *
 * Form row layout component.
 *
 * This module defines a simple layout component that aligns a label
 * and a form control horizontally in a single row.
 *
 * Responsibilities:
 * - Render a label and input side-by-side
 * - Associate label with the underlying form control via `htmlFor`
 * - Provide consistent spacing and alignment for form rows
 *
 * Design notes:
 * - Layout is implemented using MUI Box with flexbox.
 * - The label is automatically linked to the child input when possible.
 * - This component is purely presentational and stateless.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * FormRowProps
 *
 * Props for the FormRow layout component.
 *
 * Props:
 * - label: text displayed as the field label
 * - children: form control element (input, select, etc.)
 * - labelWidth: fixed width for the label column
 */

type FormRowProps = {
  label: string;
  children: React.ReactNode;
  labelWidth?: string | number;
};

/* -------------------------------- Component -------------------------------- */
/**
 * FormRow
 *
 * Layout component for a single labeled form field.
 *
 * Behavior:
 * - Renders the label in a fixed-width column.
 * - Renders the form control in a flexible column.
 * - Attempts to extract `id` from the child element and bind it
 *   to the label via `htmlFor` for accessibility.
 *
 * Notes:
 * - If `children` is not a valid React element or has no `id` prop,
 *   the label will be rendered without `htmlFor`.
 * - Intended to be used as a low-level layout primitive in forms.
 */

export function FormRow({ label, children, labelWidth = "30%" }: FormRowProps) {
  let childId: string | undefined;

  if (React.isValidElement(children)) {
    childId = (children.props as { id?: string }).id;
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: "var(--gap-standart)",
        alignItems: "flex-start",
        width: "100%",
      }}
    >
      <Box sx={{ width: labelWidth, flexShrink: 0 }}>
        <Typography
          component="label"
          htmlFor={childId}
          sx={{
            fontSize: "var(--medium-font-size)",
            color: "var(--color-gunmetal)",
            fontFamily: "var(--secondary-font)",
            cursor: "pointer",
          }}
        >
          {label}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
