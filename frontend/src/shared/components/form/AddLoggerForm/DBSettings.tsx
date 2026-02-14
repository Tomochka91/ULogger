import { useWatch, useFormContext, Controller } from "react-hook-form";
import type { LoggerFormValues } from "./loggerForm.types";
import { Box, IconButton, InputAdornment } from "@mui/material";
import { FormRow } from "../FormRow/FormRow";
import { FormInput } from "../FormInput/FormInput";
import { PasswordInput } from "../PasswordInput/PasswordInput";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { FormCheckbox } from "../FormCheckBox/FormCheckBox";
import { HelperText } from "../FormHelperText/HelperText";
import { useState } from "react";

/**
 * src/shared/components/form/AddLoggerForm/DbSettings.tsx
 *
 * Database writing settings section.
 *
 * This module encapsulates all database-related configuration fields
 * for a logger. It is rendered inside AddLoggerForm and isolated to
 * prevent unnecessary re-renders of unrelated form sections.
 *
 * Responsibilities:
 * - Bind database-related form fields:
 *   - db_user
 *   - db_password
 *   - table_name
 *   - enabled (DB writing toggle)
 * - Apply conditional validation rules based on `enabled`
 * - Handle password visibility toggle (UI-only state)
 *
 * Data model:
 * - Writes under root-level LoggerFormValues:
 *   - db_user: string
 *   - db_password: string
 *   - table_name: string
 *   - enabled: boolean
 *
 * Validation logic:
 * - When `enabled === true`:
 *   - db_user is required
 *   - db_password is required
 *   - table_name is required
 * - When `enabled === false`:
 *   - All DB-related fields are optional
 *
 * Design notes:
 * - Uses `useFormContext` to access shared form control.
 * - Uses `useWatch({ name: "enabled" })` to reactively update validation.
 * - `showPassword` state is local and does NOT affect the parent form.
 * - Component is intentionally isolated to avoid full-form re-renders.
 *
 * Performance:
 * - Re-renders only when:
 *   - DB-related fields change
 *   - `enabled` changes
 *   - password visibility toggles
 * - Does not trigger parent AddLoggerForm re-render.
 */

export function DbSettings() {
  const { control } = useFormContext<LoggerFormValues>();
  const enabled = useWatch({ control, name: "enabled" });

  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <Box>
      <Controller
        name="db_user"
        control={control}
        rules={{
          validate: (value) =>
            enabled
              ? value
                ? true
                : "Required when DB writing enabled"
              : true,
        }}
        render={({ field, fieldState }) => (
          <FormRow label="DB user" labelWidth="25%">
            <FormInput
              {...field}
              value={field.value ?? ""}
              id="db-user"
              fullWidth
              helperText={fieldState.error?.message ?? " "}
            />
          </FormRow>
        )}
      />

      <Controller
        name="db_password"
        control={control}
        rules={{
          validate: (value) =>
            enabled
              ? value
                ? true
                : "Required when DB writing enabled"
              : true,
        }}
        render={({ field, fieldState }) => (
          <FormRow label="DB password" labelWidth="25%">
            <PasswordInput
              {...field}
              value={field.value ?? ""}
              id="logform-auth-secret"
              fullWidth
              type="text"
              inputMode="text"
              autoComplete="off"
              masked={!showPassword}
              helperText={fieldState.error?.message ?? " "}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ ml: 0, pr: "1.4rem" }}>
                      <IconButton
                        edge="end"
                        onClick={togglePassword}
                        tabIndex={-1}
                        sx={{
                          p: 0,
                          "& svg": { width: "1.8rem", height: "1.8rem" },
                        }}
                      >
                        {showPassword ? <BsEyeSlash /> : <BsEye />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </FormRow>
        )}
      />

      <Controller
        name="table_name"
        control={control}
        rules={{
          validate: (value) =>
            enabled
              ? value
                ? true
                : "Required when DB writing enabled"
              : true,
        }}
        render={({ field, fieldState }) => (
          <FormRow label="DB table" labelWidth="25%">
            <FormInput
              {...field}
              value={field.value ?? ""}
              id="table-name"
              fullWidth
              helperText={fieldState.error?.message ?? " "}
            />
          </FormRow>
        )}
      />

      <Box
        sx={{ display: "flex", gap: "var(--gap-mini)", alignItems: "center" }}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <FormRow label="DB writing" labelWidth="25%">
                <FormCheckbox
                  id="enable-db-writing"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              </FormRow>
              <HelperText>{fieldState.error?.message ?? " "}</HelperText>
            </>
          )}
        />
      </Box>
    </Box>
  );
}
