import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { BsEye, BsEyeSlash } from "react-icons/bs";

import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";

import { FormInput } from "../FormInput/FormInput";
import { FormRow } from "../FormRow/FormRow";
import { dbFormValidation } from "../../../utils/validation/dbFormValidation";
import { getDBSettings } from "../../../../api/apiDB";
import {
  useDBSettingsSave,
  useDBSettingsTest,
} from "../../../hooks/useDBSettings";
import { TestButton } from "../../ui/button/TestButton";
import { SaveButton } from "../../ui/button/SaveButton";
import { PasswordInput } from "../PasswordInput/PasswordInput";
import type { DBSettings } from "../../../types";
import { isAbortError } from "../../../utils/apiHelpers";

/**
 * src/shared/components/form/DBForm/DBForm.tsx
 *
 * Database connection settings form.
 *
 * This module implements a form for viewing, validating, testing and saving
 * backend database connection settings.
 *
 * Responsibilities:
 * - Render DB settings fields (host, port, user, password, database)
 * - Validate inputs via `dbFormValidation` (react-hook-form rules)
 * - Load current settings from backend (`getDBSettings`)
 * - Provide "Test" and "Save" actions via mutation hooks
 * - Enforce workflow: Save is enabled only after a successful Test
 * - Allow cancelling an in-flight Test request without extra UI controls
 *
 * Data flow:
 * - On mount:
 *   - Fetch settings via React Query (`getDBSettings`)
 *   - Hydrate the form via `reset()` once data is available
 *
 * - On Test (button click):
 *   - Uses `handleSubmit` to validate before testing
 *   - Runs `useDBSettingsTest()` mutation with current form values
 *   - On success:
 *     - sets `isTested = true`
 *     - stores `testedValues` snapshot to lock-in the "tested" state
 *   - On error:
 *     - ignores AbortError (user-initiated cancellation)
 *     - otherwise resets `isTested` to false
 *
 * - On Cancel (same button while testing):
 *   - When `isTesting === true`, the Test button label becomes "Cancel"
 *   - Clicking it calls `cancelTest()` which aborts the request via AbortController
 *   - Abort errors are filtered out using `isAbortError` (no error UI, no state reset)
 *
 * - On change after Test:
 *   - Watches form values (`useWatch`)
 *   - If current values diverge from `testedValues`, resets `isTested` to false
 *   - This enforces: any changes require re-test before saving
 *
 * - On Save (form submit):
 *   - Runs `useDBSettingsSave()` mutation
 *   - Save is disabled until `isTested` is true and values remain unchanged
 *
 * Design notes:
 * - Uses react-hook-form as a local form state manager.
 * - Uses React Query for fetching the current DB settings.
 * - Uses custom hooks for test/save mutations to keep API logic outside UI.
 * - Test cancellation uses Fetch AbortController; AbortError is treated as a non-error.
 * - Password visibility is handled via `PasswordInput` with CSS masking.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * defaultDbValues
 *
 * Default DB settings used for initial form state.
 *
 * Notes:
 * - These values are used only until the backend settings are fetched.
 * - Once `getDBSettings` resolves, the form is reset to actual server values.
 */

const defaultDbValues: DBSettings = {
  host: "192.162.1.56",
  port: 5432,
  user: "",
  password: "",
  database: "fishing",
};

/* -------------------------------- Component -------------------------------- */
/**
 * DBForm
 *
 * DB settings form with "Test before Save" behavior.
 *
 * Validation:
 * - Field rules are provided by `dbFormValidation`.
 *
 * Test state:
 * - `isTested`: true only when last tested values match current form values.
 * - `testedValues`: snapshot of values that passed the test.
 *
 * UI state:
 * - Loading/error state for initial fetch is shown near the title.
 * - Save button is disabled until test succeeds and values are unchanged.
 */

export function DBForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<DBSettings>({
    defaultValues: defaultDbValues,
  });

  const {
    data: dbSettings,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["DBSettings"],
    queryFn: getDBSettings,
  });

  const [isTested, setIsTested] = useState(false);
  const [testedValues, setTestedValues] = useState<DBSettings | null>(null);

  const watchedValues = useWatch({ control });

  const { testMutate, isTesting, cancelTest } = useDBSettingsTest();
  const { saveMutate, isSaving } = useDBSettingsSave();

  /**
   * handleTestSettings
   *
   * Runs a test connection request using current form values.
   * On success:
   * - marks the current values as tested
   * - enables Save button (until values are changed)
   *
   * Notes:
   * - Uses `handleSubmit` to ensure validation runs before testing.
   */
  const handleTestSettings = handleSubmit((values) => {
    setIsTested(false);

    testMutate(values, {
      onSuccess: () => {
        setIsTested(true);
        setTestedValues(values);
      },
      onError: (err) => {
        if (isAbortError(err)) return;
        setIsTested(false);
      },
    });
    console.log("DB Form Data to test:", values);
  });

  const handleTestClick = () => {
    if (isTesting) {
      cancelTest();
      return;
    }
    handleTestSettings();
  };

  /**
   * handleSaveSettings
   *
   * Submits current form values to backend as DB settings.
   *
   * Notes:
   * - Bound to the form `onSubmit`.
   * - Save button is disabled until `isTested` is true.
   */
  const handleSaveSettings = handleSubmit((values) => {
    saveMutate(values);
    console.log("DB Form Data to save:", values);
  });

  /**
   * Reset test status when form values diverge from the last tested snapshot.
   *
   * This enforces the workflow: if you change anything after a successful test,
   * you must test again before saving.
   */
  useEffect(() => {
    if (!testedValues) return;

    const hasChanges =
      JSON.stringify(testedValues) !== JSON.stringify(watchedValues);

    if (hasChanges) {
      setIsTested(false);
    }
  }, [watchedValues, testedValues]);

  /**
   * Load existing DB settings from backend and hydrate the form.
   */
  useEffect(() => {
    if (dbSettings && !isError) {
      reset(dbSettings);
    }
  }, [dbSettings, reset, isError]);

  /**
   * Password visibility toggle (visual masking).
   */
  const [showPassword, setShowPassword] = useState(false);
  const togglePassword = () => setShowPassword((prev) => !prev);

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSaveSettings}
      sx={{
        maxWidth: "50%",
        mt: "var(--margin-standart)",
        p: "var(--padding-big)",
        borderRadius: "var(--border-radius-medium)",
        border: "var(--border-standart)",
        boxShadow: 3,
        bgcolor: "var(--form-background)",
        fontFamily: "var(--secondary-font)",

        "@media (max-width:1024px)": {
          maxWidth: "100%",
        },
      }}
    >
      <Stack
        direction="row"
        spacing="var(--gap-mini)"
        mb="var(--margin-medium)"
      >
        <Stack
          direction="row"
          justifyContent="end"
          alignItems="end"
          spacing="var(--gap-main)"
        >
          <Typography
            variant="inherit"
            component="h4"
            color="var(--color-gunmetal)"
          >
            DataBase connection
          </Typography>

          {isLoading && (
            <Typography
              component="p"
              sx={{
                fontSize: "var(--standart-font-size)",
                fontFamily: "var(--secondary-font)",
                color: "var(--color-jungle-green)",
              }}
            >
              Loading settings...
            </Typography>
          )}

          {isError && (
            <Typography
              component="p"
              sx={{
                fontSize: "var(--standart-font-size)",
                fontFamily: "var(--secondary-font)",
                color: "var(--color-bittersweet-shimmer)",
              }}
            >
              {(error as Error)?.message || "Failed to load DB settings"}
            </Typography>
          )}
        </Stack>
      </Stack>

      <FormRow label="Host">
        <FormInput
          id="host"
          fullWidth
          placeholder="192.162.1.56"
          inputMode="decimal"
          {...register("host", dbFormValidation.ipAddress)}
          helperText={errors.host?.message || " "}
        />
      </FormRow>

      <FormRow label="Port">
        <FormInput
          id="port"
          fullWidth
          placeholder="5432"
          inputMode="numeric"
          pattern="[0-9]*"
          {...register("port", dbFormValidation.port)}
          helperText={errors.port?.message || " "}
        />
      </FormRow>

      <FormRow label="User">
        <FormInput
          id="user"
          fullWidth
          autoComplete="username"
          {...register("user", dbFormValidation.login)}
          helperText={errors.user?.message || " "}
        />
      </FormRow>

      <FormRow label="Password">
        <PasswordInput
          id="db-auth-secret"
          fullWidth
          type="text"
          autoComplete="off"
          masked={!showPassword}
          {...register("password", dbFormValidation.password)}
          helperText={errors.password?.message || " "}
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

      <FormRow label="Database">
        <FormInput
          id="database"
          fullWidth
          {...register("database", dbFormValidation.dbName)}
          helperText={errors.database?.message || " "}
        />
      </FormRow>

      <Box
        sx={{
          mt: "var(--margin-big)",
          display: "flex",
          gap: "var(--gap-medium)",
        }}
      >
        <TestButton
          loading={isTesting}
          disabled={isSubmitting || isLoading}
          onClick={handleTestClick}
          label={isTesting ? "Cancel" : "Test connection"}
        />
        <SaveButton
          loading={isSaving}
          disabled={isSubmitting || isLoading || !isTested}
          fullWidth
        />
      </Box>
    </Box>
  );
}
