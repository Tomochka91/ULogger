import { Controller, useFieldArray, useFormContext } from "react-hook-form";

import { Box, IconButton, MenuItem } from "@mui/material";
import {
  BsArrowReturnRight,
  BsPlusCircle,
  BsTrash,
  BsXCircle,
} from "react-icons/bs";

import { FormInput } from "../../../FormInput/FormInput";
import { makeNumberChangeHandler } from "../../../../../utils/numberField";
import { FormSelect } from "../../../FormSelect/FormSelect";
import { makeNullableNumberChangeHandler } from "../../../../../utils/nullableNumberField";
import { HelperText } from "../../../FormHelperText/HelperText";
import type { ModbusEncodingType } from "../../../../../types";
import type { LoggerFormValues } from "../../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/SlavesTab/SlaveRow.tsx
 *
 * Modbus slave row editor.
 *
 * This module renders a single Modbus "slave" configuration row inside the
 * AddLoggerForm settings tab (RTU/TCP). Each slave contains:
 * - Slave metadata (name, id)
 * - A dynamic list of Modbus variables (name, address, encoding, scaling, default)
 *
 * Responsibilities:
 * - Bind slave fields to react-hook-form via `Controller`
 * - Manage nested variable array via `useFieldArray`
 * - Provide UI controls for:
 *   - adding a variable
 *   - removing a variable (disabled when only one variable remains)
 *   - removing the whole slave row (delegated via `onRemove`)
 *
 * Data model (as used by this component):
 * - `${fieldPrefix}.slaves[index]`:
 *   - slave_name: string
 *   - slave_id: number
 *   - variables: array of variable configs
 *
 * Design notes:
 * - Uses `useFormContext` to access the parent form control.
 * - Uses nested `useFieldArray` for variables.
 * - Numeric inputs use centralized change handlers:
 *   - `makeNumberChangeHandler` for required numeric values
 *   - `makeNullableNumberChangeHandler` for nullable numeric values
 * - `HelperText` is used where MUI controls require spacing consistency
 *   (e.g. below Select) even when no error is shown.
 */

/* --------------------------------- Types ---------------------------------- */
/**
 * SlaveRowProps
 *
 * Props for a single slave editor row.
 *
 * Props:
 * - index: index of the slave within `${fieldPrefix}.slaves`
 * - fieldPrefix: form namespace for modbus settings ("modbus_rtu" | "modbus_tcp")
 * - onRemove: callback to remove this slave from the parent array
 */

type SlaveRowProps = {
  index: number;
  fieldPrefix: "modbus_rtu" | "modbus_tcp";
  onRemove: () => void;
};

/* -------------------------------- Constants -------------------------------- */
/**
 * encodingValues
 *
 * List of supported Modbus variable encodings exposed in the UI.
 *
 * Notes:
 * - Values are rendered into MenuItem options.
 * - The selected value is cast to `ModbusEncodingType` on change.
 */

const encodingValues = [
  "u16",
  "s16",
  "u16_scaled",
  "s16_scaled",
  "u32_abcd",
  "u32_cdab",
  "s32_abcd",
  "s32_cdab",
  "u32_scaled_abcd",
  "u32_scaled_cdab",
  "s32_scaled_abcd",
  "s32_scaled_cdab",
  "f32_abcd",
  "f32_cdab",
  "f32_scaled_abcd",
  "f32_scaled_cdab",
];

/* -------------------------------- Component -------------------------------- */
/**
 * SlaveRow
 *
 * UI/editor for a single Modbus slave and its nested variables.
 *
 * Nested arrays:
 * - variables are managed via `useFieldArray({ name: variablesPath })`.
 *
 * Validation:
 * - slave_id: required integer > 0
 * - address: required integer >= 0
 *
 * UX constraints:
 * - At least one variable must exist per slave (remove disabled for last item).
 */

export function SlaveRow({ index, fieldPrefix, onRemove }: SlaveRowProps) {
  const { control } = useFormContext<LoggerFormValues>();

  const slavePath = `${fieldPrefix}.slaves.${index}` as const;
  const variablesPath = `${slavePath}.variables` as const;

  const {
    fields: variableFields,
    append: appendVariable,
    remove: removeVariable,
  } = useFieldArray({ control, name: variablesPath });

  const isLastVariable = variableFields.length === 1;

  /**
   * handleAddVariable
   *
   * Appends a new variable configuration to the current slave.
   *
   * Defaults:
   * - encoding: "u16"
   * - k: 1.0
   * - b: 0
   * - default: null
   */

  const handleAddVariable = () => {
    appendVariable({
      name: "",
      address: 0,
      encoding: "u16",
      k: 1.0,
      b: 0,
      default: null,
    });
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: "var(--gap-standart)",
          padding: "1rem 1rem 0",
        }}
      >
        <Controller
          name={`${slavePath}.slave_name`}
          control={control}
          render={({ field }) => (
            <FormInput
              {...field}
              value={field.value ?? ""}
              placeholder="Slave Name"
              helperText={" "}
            />
          )}
        />

        <Controller
          name={`${slavePath}.slave_id`}
          control={control}
          rules={{
            required: "Id is required",
            validate: (val) => {
              if (typeof val !== "number") return true;
              if (val <= 0) return "Id must be greater than 0";
              if (!Number.isInteger(val)) return "Id must be an integer";
              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <FormInput
              {...field}
              slotProps={{ htmlInput: { step: 1, min: 1 } }}
              value={field.value ?? ""}
              placeholder="Slave Id"
              type="number"
              onChange={makeNumberChangeHandler(field)}
              helperText={fieldState.error?.message ?? " "}
            />
          )}
        />

        <IconButton
          onClick={handleAddVariable}
          size="small"
          sx={{ mb: "1rem", padding: 0 }}
        >
          <BsPlusCircle />
        </IconButton>

        <IconButton
          onClick={onRemove}
          size="small"
          sx={{ mb: "1rem", padding: 0 }}
        >
          <BsTrash color="var(--color-indian-red)" />
        </IconButton>
      </Box>

      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-mini)",
          borderBlockEnd: "var(--border-standart)",
          padding: "0 1rem",
        }}
      >
        {variableFields.map((item, varIndex) => {
          const varPath = `${variablesPath}.${varIndex}` as const;

          return (
            <Box
              key={item.id}
              sx={{
                display: "grid",
                gridTemplateColumns: "min-content repeat(6, 1fr) min-content",
                gap: "var(--gap-standart)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <BsArrowReturnRight
                style={{
                  width: "1.6rem",
                  height: "1.6rem",
                  flexShrink: 0,
                  marginBlockEnd: "1rem",
                  padding: 0,
                }}
              />

              <Controller
                name={`${varPath}.name`}
                control={control}
                render={({ field }) => (
                  <FormInput
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Variable name"
                    helperText={" "}
                  />
                )}
              />

              <Controller
                name={`${varPath}.address`}
                control={control}
                rules={{
                  required: "Address is required",
                  validate: (val) => {
                    if (typeof val !== "number") return true;
                    if (val < 0) return "Address must be ≥ 0";
                    if (!Number.isInteger(val))
                      return "Address must be an integer";
                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <FormInput
                    {...field}
                    type="number"
                    slotProps={{ htmlInput: { step: 1, min: 0 } }}
                    value={field.value ?? ""}
                    onChange={makeNumberChangeHandler(field)}
                    placeholder="Address"
                    helperText={fieldState.error?.message ?? " "}
                  />
                )}
              />

              <Controller
                name={`${varPath}.encoding`}
                control={control}
                render={({ field }) => (
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <FormSelect
                      {...field}
                      value={field.value ?? ""}
                      variant="outlined"
                      onChange={(e) =>
                        field.onChange(e.target.value as ModbusEncodingType)
                      }
                    >
                      {encodingValues.map((val) => (
                        <MenuItem key={val} value={val}>
                          {val}
                        </MenuItem>
                      ))}
                    </FormSelect>
                    <HelperText> </HelperText>
                  </Box>
                )}
              />

              <Controller
                name={`${varPath}.k`}
                control={control}
                render={({ field }) => (
                  <FormInput
                    {...field}
                    type="number"
                    slotProps={{ htmlInput: { step: "any" } }}
                    value={field.value ?? ""}
                    onChange={makeNumberChangeHandler(field)}
                    placeholder="k"
                    helperText={" "}
                  />
                )}
              />

              <Controller
                name={`${varPath}.b`}
                control={control}
                render={({ field }) => (
                  <FormInput
                    {...field}
                    type="number"
                    slotProps={{ htmlInput: { step: "any" } }}
                    value={field.value ?? ""}
                    onChange={makeNumberChangeHandler(field)}
                    placeholder="b"
                    helperText={" "}
                  />
                )}
              />

              <Controller
                name={`${varPath}.default`}
                control={control}
                render={({ field }) => (
                  <FormInput
                    {...field}
                    type="number"
                    value={field.value ?? ""}
                    onChange={makeNullableNumberChangeHandler(field)}
                    placeholder="default"
                    helperText={" "}
                  />
                )}
              />

              <IconButton
                onClick={() => removeVariable(varIndex)}
                disabled={isLastVariable}
                sx={{
                  padding: 0,
                  mb: "1rem",
                  width: "1.6rem",
                  height: "1.6rem",
                  opacity: isLastVariable ? 0.4 : 1,
                }}
              >
                <BsXCircle color="var(--color-indian-red)" />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    </>
  );
}
