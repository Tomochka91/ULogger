import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";
import { Box, Divider, FormControl, MenuItem } from "@mui/material";

import { FormRow } from "../FormRow/FormRow";
import { FormSelect } from "../FormSelect/FormSelect";
import { HelperText } from "../FormHelperText/HelperText";
import { FormCheckbox } from "../FormCheckBox/FormCheckBox";
import { TypeSettings } from "./TypeSettings";
import { getLoggerList } from "../../../../api/apiConnections";
import { ConfirmDialog } from "../../ui/dialog/ConfirmDialog";
import { useDeleteLogger } from "../../../hooks/useDeleteLogger";
import { useSaveLogger } from "../../../hooks/useSaveLogger";
import { useLoggerFormState } from "../../../hooks/useLoggerFormState";
import { createLoggerDefaultValues } from "./loggerDefaults";
import { type Logger, type LoggerList } from "../../../types";
import type { UsedLoggerType } from "./loggerRegistry";
import type { LoggerFormValues } from "./loggerForm.types";
import { DbSettings } from "./DBSettings";
import { LoggerNameSettings } from "./LoggerNameSettings";
import { ActionBar } from "./ActionBar";

/**
 * src/shared/components/form/AddLoggerForm/AddLoggerForm.tsx
 *
 * Add / Edit Logger Form (main coordinator component).
 *
 * This component orchestrates the entire lifecycle of creating,
 * editing and deleting logger configurations.
 *
 * Architecture overview
 * ----------------------
 *
 * The form is built on React Hook Form (RHF) and uses a ref-backed
 * draft persistence mechanism (LoggerFormStateProvider) to survive:
 * - route navigation
 * - component unmount/mount
 * - internal tab switching
 *
 * The component itself is intentionally split into smaller,
 * isolated sections to prevent unnecessary re-renders.
 *
 *
 * Core responsibilities
 * ---------------------
 *
 * 1) Form initialization
 *    - Initializes RHF with persisted draft values via `getDraft()`
 *    - Uses `mode: "onChange"` for live validation
 *
 * 2) Draft persistence
 *    - <DraftSaver /> subscribes to full form values via `useWatch`
 *    - Persists them to ref-backed store using a debounce (500ms)
 *    - Does NOT trigger global re-renders
 *
 * 3) Existing logger handling
 *    - Loads logger list via React Query
 *    - Provides autocomplete options
 *    - Resolves selected logger by name
 *    - Stores selected logger in local state
 *
 * 4) Save logic
 *    - Delegates to `useSaveLogger(selectedLogger)`
 *    - Automatically decides create vs update
 *    - Resets to NEW_LOGGER_DEFAULTS after successful creation
 *
 * 5) Delete logic
 *    - Opens confirmation dialog
 *    - Delegates deletion to `useDeleteLogger`
 *    - Clears selection and resets form after successful delete
 *
 *
 * Section decomposition (performance-driven)
 * ------------------------------------------
 *
 * The form is intentionally split into independent components:
 *
 * - <LoggerNameSettings />
 *   Owns:
 *     - `name`
 *     - autocomplete
 *     - edit-mode selection
 *     - delete trigger
 *
 * - Type selector (inline here)
 *   Owns:
 *     - `type`
 *     - merged defaults on type change
 *
 * - <DbSettings />
 *   Owns:
 *     - db_user
 *     - db_password
 *     - table_name
 *     - enabled
 *   Uses `useWatch` internally for conditional validation.
 *
 * - <TypeSettings />
 *   Subscribes only to `type` via `useWatch`
 *   Renders logger-specific configuration sections.
 *
 * - <ActionBar />
 *   Subscribes only to form validity via `useFormState`
 *   Renders Save / Reset buttons.
 *
 *
 * Reset behavior
 * --------------
 *
 * NEW_LOGGER_DEFAULTS:
 * - Used when:
 *   - Clearing form
 *   - Switching from existing logger to new logger
 *   - After successful creation
 *
 * Type switching:
 * - Rebuilds defaults for new type
 * - Preserves common fields:
 *     name, db_*, enabled, autostart
 * - Applies special rule for Mbox `query_template`
 *
 *
 * Performance design goals
 * ------------------------
 *
 * - Avoid top-level `watch()` subscriptions in AddLoggerForm
 * - Keep subscriptions local to the components that need them
 * - Use ref-backed draft store instead of React state
 * - Debounce draft updates
 * - Isolate re-renders to small sections
 *
 * Result:
 * - Typing in fields does not re-render the entire form
 * - Changing logger type re-renders only relevant sections
 * - Save button re-renders only when validity changes
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * NEW_LOGGER_DEFAULTS
 *
 * Default form snapshot for a brand-new logger.
 *
 * Used when:
 * - Resetting the form
 * - Clearing selection
 * - After successful creation
 *
 * Must remain in sync with logger registry defaults.
 */

const NEW_LOGGER_DEFAULTS = createLoggerDefaultValues("easy_serial");

/**
 * DraftSaver
 *
 * Internal helper component responsible for persisting
 * the current form snapshot into the external draft store.
 *
 * Implementation:
 * - Subscribes to full form state via `useWatch({ control })`
 * - Debounces updates (500ms)
 * - Writes to ref-backed store (setDraft)
 *
 * Important:
 * - Updating draft does NOT trigger re-renders,
 *   because storage is implemented via `useRef` in the provider.
 * - Guard `if (!values) return;` prevents writing transient states.
 */

interface DraftSaverProps {
  control: Control<LoggerFormValues>;
  setDraft: (values: LoggerFormValues) => void;
}

function DraftSaver({ control, setDraft }: DraftSaverProps) {
  const values = useWatch<LoggerFormValues>({ control });

  useEffect(() => {
    if (!values) return;

    const timeout = setTimeout(() => {
      setDraft(values as LoggerFormValues);
    }, 500);

    return () => clearTimeout(timeout);
  }, [values, setDraft]);

  return null;
}

/* -------------------------------- Component -------------------------------- */
/**
 * AddLoggerForm
 *
 * Behavior:
 * - Autocomplete:
 *   - empty value → reset to NEW_LOGGER_DEFAULTS
 *   - existing name → load logger from list and reset form with mapped values
 * - Type switch:
 *   - rebuild defaults for new type
 *   - preserve common fields from current form state
 *   - special rule for MBox query_template (keep default template)
 * - Save:
 *   - create or update depending on selected logger presence (useSaveLogger)
 * - Delete:
 *   - only available when an existing logger is selected
 *   - confirm dialog protects from accidental delete
 *
 * Notes:
 * - Form state is mirrored into external store via useLoggerFormState
 *   so it survives navigation/re-renders.
 */

export function AddLoggerForm() {
  const [selectedLogger, setSelectedLogger] = useState<Logger | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { getDraft, setDraft } = useLoggerFormState();

  /**
   * RHF setup:
   * - mode "onChange" enables live validity updates for Save button
   */
  const methods = useForm<LoggerFormValues>({
    defaultValues: getDraft(),
    mode: "onChange",
  });

  const { control, handleSubmit, reset, getValues } = methods;

  /**
   * Load existing loggers list for autocomplete and edit mode.
   * We keep the list fresh-ish (staleTime 5 min) without aggressive refetching.
   */
  const { data: loggerList } = useQuery<LoggerList>({
    queryKey: ["logger-list"],
    queryFn: getLoggerList,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  /**
   * Autocomplete options are just names.
   */
  const autocompleteOptions = useMemo(
    () => loggerList?.map((log) => log.name) ?? [],
    [loggerList],
  );

  /**
   * Helper to find a logger by name in the loaded list.
   */
  const getLoggerByName = useCallback(
    (name: string | null | undefined) =>
      loggerList?.find((log) => log.name === name) ?? null,
    [loggerList],
  );

  /**
   * Reset handler:
   * - resets RHF to NEW_LOGGER_DEFAULTS
   * - syncs external persisted state
   */
  const onClear = () => {
    reset(NEW_LOGGER_DEFAULTS);
    setDraft(NEW_LOGGER_DEFAULTS);
  };

  /**
   * Save handler:
   * - useSaveLogger decides create vs update based on selectedLoggerObj
   * - after successful create, reset to new defaults
   */
  const { saveLogger, isSaving, isEditMode } = useSaveLogger(selectedLogger);

  const onSubmit = (values: LoggerFormValues) => {
    console.log(values);
    saveLogger(values, {
      onSuccess: () => {
        if (!isEditMode) {
          onClear();
        }
      },
    });
  };

  /**
   * Delete flow:
   * - open confirm dialog only when a logger is selected
   * - block closing dialog while delete request is in-flight
   */

  const { removeLogger, isDeleting } = useDeleteLogger();

  const handleOpenConfirmDialog = (logger: Logger) => {
    setSelectedLogger(logger);
    setIsConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    if (isDeleting) return;
    setIsConfirmDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!selectedLogger || selectedLogger.id == null) return;

    removeLogger(selectedLogger.id, {
      onSuccess: () => {
        setIsConfirmDialogOpen(false);
        setSelectedLogger(null);
        reset(NEW_LOGGER_DEFAULTS);
      },
    });
  };

  return (
    <FormProvider {...methods}>
      <DraftSaver control={control} setDraft={setDraft} />
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--gap-standart)",
          width: "100%",
          marginTop: "var(--margin-standart)",
          fontFamily: "var(--secondary-font)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr min-content 1fr",
            p: "var(--pading-equal)",
            borderRadius: "var(--border-radius-medium)",
            border: "var(--border-standart)",
            boxShadow: 1,
            fontFamily: "var(--secondary-font)",
          }}
        >
          <Box>
            <LoggerNameSettings
              control={control}
              reset={reset}
              autocompleteOptions={autocompleteOptions}
              getLoggerByName={getLoggerByName}
              onSelectedLoggerChange={setSelectedLogger}
              onRequestDelete={handleOpenConfirmDialog}
            />

            <FormRow label="Logger type" labelWidth="25%">
              <FormControl fullWidth>
                <Controller
                  name="type"
                  control={control}
                  rules={{ required: "Select logger type" }}
                  render={({ field, fieldState }) => (
                    <>
                      <FormSelect
                        {...field}
                        value={field.value ?? ""}
                        variant="outlined"
                        onChange={(event) => {
                          const nextType = event.target.value as UsedLoggerType;
                          const current = getValues();
                          const defaults = createLoggerDefaultValues(nextType);
                          const merged: LoggerFormValues = {
                            ...defaults,
                            name: current.name,
                            db_user: current.db_user,
                            db_password: current.db_password,
                            table_name: current.table_name,
                            autostart: current.autostart,
                            enabled: current.enabled,
                            query_template:
                              nextType === "mbox"
                                ? defaults.query_template
                                : "",
                          };
                          reset(merged);
                          setDraft(merged);
                        }}
                      >
                        <MenuItem value={"easy_serial"}>Easy Serial</MenuItem>
                        <MenuItem value={"mbox"}>Mbox</MenuItem>
                        <MenuItem value={"mbox_counter"}>Mbox Counter</MenuItem>
                        <MenuItem value={"modbus_rtu"}>Modbus RTU</MenuItem>
                        <MenuItem value={"modbus_tcp"}>Modbus TCP</MenuItem>
                      </FormSelect>
                      <HelperText>
                        {fieldState.error?.message ?? " "}
                      </HelperText>
                    </>
                  )}
                />
              </FormControl>
            </FormRow>

            <Box
              sx={{
                display: "flex",
                gap: "var(--gap-mini)",
                alignItems: "center",
              }}
            >
              <Controller
                name="autostart"
                control={control}
                render={({ field }) => (
                  <FormRow label="Autostart" labelWidth="25%">
                    <FormCheckbox
                      id="autostart"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormRow>
                )}
              />
            </Box>
          </Box>

          <Divider
            orientation="vertical"
            variant="middle"
            flexItem
            sx={{ marginInline: "2rem" }}
          />

          <DbSettings />
        </Box>

        <TypeSettings />

        <ActionBar
          onClear={onClear}
          isSaving={isSaving}
          isEditMode={isEditMode}
        />
      </Box>

      <ConfirmDialog
        open={isConfirmDialogOpen}
        loading={isDeleting}
        title="Delete logger"
        description={`Are you sure you want to delete this logger: '${selectedLogger?.name}'?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmDelete}
      />
    </FormProvider>
  );
}
