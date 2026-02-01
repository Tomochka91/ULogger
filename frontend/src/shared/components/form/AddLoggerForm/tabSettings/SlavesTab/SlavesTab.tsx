import { useFieldArray, useFormContext } from "react-hook-form";

import { Box, IconButton } from "@mui/material";
import { BsPlus } from "react-icons/bs";

import { HelperText } from "../../../FormHelperText/HelperText";
import { SlaveRow } from "./SlaveRow";
import type { LoggerFormValues } from "../../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/SlavesTab/SlavesTab.tsx
 *
 * Modbus slaves editor tab.
 *
 * This module implements the settings tab section responsible for editing
 * the array of Modbus slaves for RTU/TCP logger configurations.
 *
 * Responsibilities:
 * - Manage the top-level slaves array via `useFieldArray`
 * - Provide UI for adding/removing slaves
 * - Render each slave using `SlaveRow`
 * - Render an empty-state helper message when no slaves exist
 *
 * Data model (as used by this component):
 * - `${fieldPrefix}.slaves`: array of slave configs
 *
 * Design notes:
 * - Uses `useFormContext` to reuse the parent AddLoggerForm form state.
 * - The component is parameterized by `fieldPrefix` to support both:
 *   - "modbus_rtu"
 *   - "modbus_tcp"
 * - Default slave includes exactly one variable to guarantee a valid structure.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * SlavesTabProps
 *
 * Props for SlavesTab.
 *
 * Props:
 * - fieldPrefix: form namespace for modbus settings ("modbus_rtu" | "modbus_tcp")
 */

type SlavesTabProps = {
  fieldPrefix: "modbus_rtu" | "modbus_tcp";
};

/* -------------------------------- Component -------------------------------- */
/**
 * SlavesTab
 *
 * Editor for the Modbus slaves array.
 *
 * Behavior:
 * - Add (+): appends a new slave object with one default variable.
 * - Remove: handled by `SlaveRow` via callback to `remove(index)`.
 * - Empty state: shows a helper message when `fields.length === 0`.
 */

export function SlavesTab({ fieldPrefix }: SlavesTabProps) {
  const { control } = useFormContext<LoggerFormValues>();

  const arrayName = `${fieldPrefix}.slaves` as const;

  const { fields, append, remove } = useFieldArray({
    control,
    name: arrayName,
  });

  /**
   * createDefaultVariable
   *
   * Factory for a default Modbus variable entry.
   *
   * Notes:
   * - Ensures the initial structure is always present for a new slave.
   * - Encoding defaults to "u16".
   */

  const createDefaultVariable = () => ({
    name: "",
    address: 0,
    encoding: "u16" as const,
    k: 1.0,
    b: 0,
    default: null,
  });

  /**
   * handleAddFieldSlave
   *
   * Appends a new slave configuration entry to the slaves array.
   *
   * Defaults:
   * - slave_id: 1
   * - variables: one default variable (required structure)
   */

  const handleAddFieldSlave = () => {
    append({
      slave_name: "",
      slave_id: 1,
      variables: [createDefaultVariable()],
    });
  };

  return (
    <>
      <Box
        sx={{
          gridColumn: "1/-1",
          marginTop: "var(--border-standart)",
          borderTop: "var(--border-standart)",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          justifyContent: "flex-start",
          alignItems: "flex-start",
        }}
      >
        <IconButton
          onClick={handleAddFieldSlave}
          size="large"
          sx={{ padding: "1rem", marginBlockStart: "1rem" }}
        >
          <BsPlus />
        </IconButton>
      </Box>

      <Box
        sx={{
          gridColumn: "1/-1",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        {fields.length === 0 && (
          <HelperText
            sx={{
              marginBlockStart: "1rem",
              fontSize: "var(--small-font-size)",
              padding: "var(--padding-mini)",
              textAlign: "start",
            }}
          >
            {" "}
            There are no slaves yet. Click + to add.
          </HelperText>
        )}

        {fields.map((item, index) => (
          <SlaveRow
            key={item.id}
            index={index}
            fieldPrefix={fieldPrefix}
            onRemove={() => remove(index)}
          />
        ))}
      </Box>
    </>
  );
}
