import { memo } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
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
import type { EasySerialFieldType } from "../../../../types";
import type { LoggerFormValues } from "../loggerForm.types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/FramerTab.tsx
 *
 * EasySerial parser ("framer") settings tab.
 *
 * Renders UI for configuring EasySerial message framing and parser field extraction.
 *
 * Responsibilities:
 * - Bind and validate framing parameters under `easy_serial.parser.*`:
 *   - preamble, terminator (required), separator, encoding
 * - Manage a dynamic list of parser fields (`easy_serial.parser.fields`) via `useFieldArray`
 * - Provide controls to add/remove parser fields
 * - Render the parser test panel (`TestEasySerialParser`)
 *
 * Data model (LoggerFormValues):
 * - easy_serial.parser.preamble: string
 * - easy_serial.parser.terminator: string (required)
 * - easy_serial.parser.separator: string
 * - easy_serial.parser.encoding: string
 * - easy_serial.parser.fields[]: Array<{ name, index, type, format }>
 *
 * Performance notes:
 * - `ParserHeader` is memoized (`React.memo`) to avoid re-rendering framing inputs
 *   when field-array rows are appended/removed.
 * - Each table row is rendered by `FieldRow`, which uses `useWatch` for
 *   `easy_serial.parser.fields.${index}.type` only. This keeps type-dependent
 *   UI (format enable/placeholder) isolated to the row that changed.
 * - `TestEasySerialParser` is colocated but should remain lightweight:
 *   it reads only `easy_serial.parser` subtree (not the full form) when testing.
 *
 * Design notes:
 * - Uses "table-like" CSS grid for consistent header/row alignment.
 * - The field list is scrollable to support large configurations.
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

/**
 * ParserHeader
 *
 * Framing inputs section for EasySerial parser.
 *
 * Memoized to keep framing fields stable during `useFieldArray` structural changes
 * (append/remove) in the fields table.
 */

const ParserHeader = memo(function ParserHeader() {
  const { control } = useFormContext<LoggerFormValues>();

  return (
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
  );
});

interface FieldRowProps {
  control: Control<LoggerFormValues>;
  itemId: string;
  index: number;
  remove: (index: number) => void;
}

/**
 * FieldRow
 *
 * Single row editor for one parser field entry.
 *
 * Perf:
 * - Uses `useWatch` only for the row's `.type` to control the `format` input UI.
 * - Keeps row-specific re-renders localized when user changes the field type.
 */

function FieldRow({ control, itemId, index, remove }: FieldRowProps) {
  const currentType = useWatch({
    control,
    name: `easy_serial.parser.fields.${index}.type`,
  }) as EasySerialFieldType | undefined;

  return (
    <Box
      key={itemId}
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
            if (!Number.isInteger(val)) return "Index must be an integer";
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
                  field.onChange(e.target.value as EasySerialFieldType)
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
            placeholder={currentType === "datetime" ? "%Y-%m-%d %H:%M" : ""}
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
}

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
 * - `useFieldArray` triggers a re-render of the list container on append/remove.
 *   `ParserHeader` is memoized to keep framing inputs cheap during those updates.
 */

export function FramerTab() {
  const { control } = useFormContext<LoggerFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "easy_serial.parser.fields",
  });

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
      <ParserHeader />
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

          {fields.map((item, index) => (
            <FieldRow
              key={item.id}
              itemId={item.id}
              control={control}
              index={index}
              remove={remove}
            />
          ))}
        </Box>
      </Box>
    </>
  );
}
