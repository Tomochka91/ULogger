import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  Box,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Typography,
} from "@mui/material";
import { BsPlus, BsTrash } from "react-icons/bs";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import { HelperText } from "../../FormHelperText/HelperText";
import { FormSelect } from "../../FormSelect/FormSelect";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { TestEasySerialParser } from "../easy-serial/TestEasySerialParser";
import type { EasySerialField, EasySerialFieldType } from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/FramerTab.tsx
 *
 * EasySerial parser ("framer") settings tab.
 *
 * This module renders the settings tab responsible for configuring
 * the EasySerial message framing and field extraction rules.
 *
 * Responsibilities:
 * - Bind EasySerial parser framing parameters:
 *   - preamble, terminator, separator, encoding
 * - Manage a dynamic list of parser fields (`easy_serial.parser.fields`)
 *   via `useFieldArray`
 * - Validate required fields and numeric constraints (index)
 * - Provide UI controls to add/remove fields
 * - Integrate parser testing UI (`TestEasySerialParser`)
 *
 * Data model:
 * - Writes under `easy_serial.parser.*` in LoggerFormValues:
 *   - easy_serial.parser.preamble: string
 *   - easy_serial.parser.terminator: string (required)
 *   - easy_serial.parser.separator: string
 *   - easy_serial.parser.encoding: string
 *   - easy_serial.parser.fields[]: array of EasySerialField
 *
 * Design notes:
 * - Uses `useFormContext` to integrate with the parent AddLoggerForm state.
 * - Uses `useFieldArray` for fields list management.
 * - Uses `useWatch` to react to per-row field type changes in order to:
 *   - enable/disable the `format` input
 *   - show a placeholder hint for datetime format
 * - Uses a "table-like" grid layout to render fields consistently.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * tableColumnHeading
 *
 * Column metadata used to render the header row for the fields table.
 */

const tableColumnHeading = [
  { key: "name", label: "Variable Name" },
  { key: "index", label: "Index" },
  { key: "type", label: "Type" },
  { key: "format", label: "Format" },
];

/**
 * tableSx
 *
 * Shared grid styling used for both table header and rows.
 *
 * Columns:
 * - 4 flexible columns (name/index/type/format)
 * - 1 compact action column (trash icon)
 *
 * The styling is reused to keep alignment identical between header and rows.
 */

const tableSx = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr) min-content",
  columnGap: "var(--gap-mini)",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "white",
  border: "var(--border-standart)",
  paddingInline: "1rem",
};

/**
 * typeValues
 *
 * Allowed values for EasySerialFieldType.
 * Rendered as options in the "Type" select.
 */

const typeValues = ["string", "int", "float", "datetime"];

/* -------------------------------- Component -------------------------------- */
/**
 * FramerTab
 *
 * Editor for `easy_serial.parser` settings.
 *
 * Behavior:
 * - Add (+): appends a new parser field with default values.
 * - Remove (trash): removes a field at index.
 * - Empty state: shows helper text when `fields.length === 0`.
 *
 * Validation:
 * - terminator: required
 * - field name: required
 * - field index: required integer >= 0
 *
 * Notes:
 * - Uses `useFormContext` to access parent AddLoggerForm state.
 * - Uses `useFieldArray` for dynamic list management.
 * - Uses `useWatch` for per-row type to enable/disable `format`.
 */

export function FramerTab() {
  const { control } = useFormContext<LoggerFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "easy_serial.parser.fields",
  });

  const fieldTypes = useWatch({
    control,
    name: "easy_serial.parser.fields",
  }) as EasySerialField[] | undefined;

  /**
   * handleAddField
   *
   * Appends a new parser field entry with sensible defaults.
   *
   * Defaults:
   * - name: empty
   * - index: 0
   * - type: string
   * - format: empty (used only for datetime)
   */
  const handleAddField = () => {
    append({
      name: "",
      index: 0,
      type: "string" as EasySerialFieldType,
      format: "",
    });
  };

  return (
    <>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          paddingBlock: "var(--pading-equal) 2px",
          borderTop: "var(--border-standart)",
        }}
      >
        <Controller
          name="easy_serial.parser.preamble"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Preamble" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="preamble"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="easy_serial.parser.terminator"
          control={control}
          rules={{ required: "Terminator is required" }}
          render={({ field, fieldState }) => (
            <FormRow label="Terminator" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="terminator"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="easy_serial.parser.separator"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Separator" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="separator"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="easy_serial.parser.encoding"
          control={control}
          render={({ field, fieldState }) => (
            <FormRow label="Encoding" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="encoding-parser"
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />
      </Box>
      <Divider
        orientation="vertical"
        variant="middle"
        flexItem
        sx={{ marginInline: "2rem" }}
      />

      <TestEasySerialParser />

      <Box
        sx={{
          gridColumn: "1/-1",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Box sx={{ ...tableSx, backgroundColor: "var(--color-mint-cream)" }}>
          {tableColumnHeading.map((col) => (
            <Typography
              key={col.key}
              component="h3"
              sx={{
                textAlign: "center",
                fontSize: "var(--medium-font-size)",
                fontFamily: "var(--secondary-font)",
                lineHeight: "var( --line-height-standart)",
                color: "var(--color-jungle-green)",
              }}
            >
              {col.label}
            </Typography>
          ))}
          <IconButton onClick={handleAddField} size="small">
            <BsPlus />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: "10vh",
            overflowY: "auto",
          }}
        >
          {fields.length === 0 && (
            <HelperText
              sx={{
                fontSize: "var(--small-font-size)",
                padding: "var(--padding-mini)",
              }}
            >
              There are no fields yet. Click + to add.
            </HelperText>
          )}

          {fields.map((item, index) => {
            const currentType = fieldTypes?.[index]?.type;

            return (
              <Box
                key={item.id}
                sx={{
                  ...tableSx,
                  borderTop: 0,
                  padding: "1rem 1rem 0",
                  "&:nth-of-type(odd)": {
                    backgroundColor: "var(--color-honeydew)",
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                    },
                  },
                  "&:last-of-type": {
                    borderBottom: "var(--border-standart)",
                  },
                }}
              >
                <Controller
                  name={`easy_serial.parser.fields.${index}.name`}
                  control={control}
                  rules={{ required: "Variable name is required" }}
                  render={({ field, fieldState }) => (
                    <FormInput
                      {...field}
                      value={field.value ?? ""}
                      placeholder="value"
                      helperText={fieldState.error?.message ?? " "}
                    />
                  )}
                />

                <Controller
                  name={`easy_serial.parser.fields.${index}.index`}
                  control={control}
                  rules={{
                    required: "Index is required",
                    validate: (val) => {
                      if (typeof val !== "number") return true;
                      if (val < 0) return "Index must be ≥ 0";
                      if (!Number.isInteger(val))
                        return "Index must be an integer";
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <FormInput
                      {...field}
                      slotProps={{ htmlInput: { step: 1, min: 0 } }}
                      value={field.value ?? ""}
                      type="number"
                      onChange={makeNumberChangeHandler(field)}
                      helperText={fieldState.error?.message ?? " "}
                    />
                  )}
                />

                <FormControl fullWidth>
                  <Controller
                    name={`easy_serial.parser.fields.${index}.type`}
                    control={control}
                    render={({ field }) => (
                      <>
                        <FormSelect
                          {...field}
                          value={field.value ?? ""}
                          variant="outlined"
                          onChange={(e) =>
                            field.onChange(
                              e.target.value as EasySerialFieldType,
                            )
                          }
                        >
                          {typeValues.map((val) => (
                            <MenuItem key={val} value={val}>
                              {val}
                            </MenuItem>
                          ))}
                        </FormSelect>
                        <HelperText> </HelperText>
                      </>
                    )}
                  />
                </FormControl>

                <Controller
                  name={`easy_serial.parser.fields.${index}.format`}
                  control={control}
                  render={({ field }) => (
                    <FormInput
                      {...field}
                      value={field.value ?? ""}
                      disabled={currentType !== "datetime"}
                      placeholder={
                        currentType === "datetime" ? "%Y-%m-%d %H:%M" : ""
                      }
                      helperText={" "}
                    />
                  )}
                />

                <IconButton
                  onClick={() => remove(index)}
                  size="small"
                  sx={{ mb: "1rem" }}
                >
                  <BsTrash color="var(--color-indian-red)" />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
