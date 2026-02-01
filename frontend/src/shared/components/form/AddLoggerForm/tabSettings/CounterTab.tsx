import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFormContext } from "react-hook-form";
import { Box, Divider, FormControl, MenuItem } from "@mui/material";

import { FormRow } from "../../FormRow/FormRow";
import { FormInput } from "../../FormInput/FormInput";
import { makeNumberChangeHandler } from "../../../../utils/numberField";
import { FormCheckbox } from "../../FormCheckBox/FormCheckBox";
import { FormSelect } from "../../FormSelect/FormSelect";
import { HelperText } from "../../FormHelperText/HelperText";
import { hasMax2Decimals } from "../../../../utils/validation/hasMaxDecimalPlaces";
import { MBOX_COUNTER_DEFAULTS } from "../mbox/mboxFormDefaults";
import { getMboxAvailableCounters } from "../../../../../api/apiConnections";
import type { LoggerFormValues } from "../loggerForm.types";
import type { LoggerList } from "../../../../types";

/**
 * src/shared/form/AddLoggerForm/tabSettings/CounterTab.tsx
 *
 * MBox external counter settings tab.
 *
 * This module renders the configuration section for linking an external counter
 * to an MBox logger and defining missing-pack behavior parameters.
 *
 * Responsibilities:
 * - Toggle external counter usage (`mbox.ext_counter`)
 * - Select counter connection + device as a single combined UI choice
 * - Validate and configure timeouts and miss-pack strategy fields
 * - Fetch available counter devices from backend (for type "mbox")
 * - Support "in use" / unavailable selection by injecting a virtual option
 *   derived from already-loaded logger list (React Query cache)
 * - Reset related fields to defaults when external counter is disabled
 *
 * Data model:
 * - All fields are stored under `mbox.*` in LoggerFormValues:
 *   - mbox.ext_counter
 *   - mbox.counter_connection_id
 *   - mbox.counter_device_id
 *   - mbox.counter_clean_timeout
 *   - mbox.counter_miss_timeout
 *   - mbox.miss_strategy
 *   - mbox.miss_insert_limit
 *   - mbox.miss_error_label
 *
 * Design notes:
 * - Available counters are fetched via `getMboxAvailableCounters`.
 * - Counter selection is represented in the UI as a single select value:
 *   `${counter_connection_id}:${device_id}`, while the form stores ids separately.
 * - When ext counter is disabled, the tab:
 *   - clears validation errors for related fields
 *   - resets values to `MBOX_COUNTER_DEFAULTS`
 * - When ext counter is enabled, the tab ensures the `(connection_id, device_id)`
 *   pair remains valid; if invalid, it auto-selects the first matching device.
 */

/* -------------------------------- Constants -------------------------------- */
/**
 * strategy
 *
 * List of supported miss-pack insertion strategies.
 *
 * Notes:
 * - Values are stored in `mbox.miss_strategy`.
 * - "last": insert relative to last known pack
 * - "default": insert using default mapping (project-specific semantics)
 */

const strategy: string[] = ["last", "default"];

/**
 * MBOX_COUNTER_DEFAULT_PATHS
 *
 * Mapping between form paths and default values used when ext counter is disabled.
 *
 * Notes:
 * - Used to reset values and clear errors when `mbox.ext_counter` is false.
 * - Tuple shape is `[path, defaultValue]`.
 */

const MBOX_COUNTER_DEFAULT_PATHS = [
  ["mbox.counter_connection_id", MBOX_COUNTER_DEFAULTS.counter_connection_id],
  ["mbox.counter_device_id", MBOX_COUNTER_DEFAULTS.counter_device_id],
  ["mbox.counter_clean_timeout", MBOX_COUNTER_DEFAULTS.counter_clean_timeout],
  ["mbox.counter_miss_timeout", MBOX_COUNTER_DEFAULTS.counter_miss_timeout],
  ["mbox.miss_strategy", MBOX_COUNTER_DEFAULTS.miss_strategy],
  ["mbox.miss_insert_limit", MBOX_COUNTER_DEFAULTS.miss_insert_limit],
  ["mbox.miss_error_label", MBOX_COUNTER_DEFAULTS.miss_error_label],
] as const;

/* -------------------------------- Component -------------------------------- */
/**
 * CounterTab
 *
 * Settings editor for external counter integration (MBox logger).
 *
 * Data sources:
 * - `getMboxAvailableCounters` provides counters that are currently available
 *   for selection (backend decides availability rules).
 * - The local cached `logger-list` (React Query) is used to reconstruct an
 *   "in use" option if current selection is not present in available list.
 *
 * Validation rules (when ext counter enabled):
 * - counter_connection_id: required and > 0
 * - counter_device_id: integer > 0 (also can be auto-selected)
 * - counter_clean_timeout / counter_miss_timeout:
 *   - required
 *   - must be ≥ 0.1
 *   - must have at most 2 decimal places
 * - miss_strategy: required
 * - miss_insert_limit: integer > 0
 * - miss_error_label: required
 *
 * UX behavior:
 * - Save values are kept stable and typed (numbers remain numbers via handlers).
 * - Disabled state of controls follows extCounterEnabled.
 */

export function CounterTab() {
  const { control, watch, clearErrors, setValue } =
    useFormContext<LoggerFormValues>();

  const type = watch("type");
  const extCounterEnabled = !!watch("mbox.ext_counter");
  const selectedConnectionId = watch("mbox.counter_connection_id");
  const currentDeviceId = watch("mbox.counter_device_id");

  /**
   * loggerList
   *
   * Cached list of loggers from React Query ("logger-list").
   *
   * Used to reconstruct a virtual "in use" counter option when the currently
   * selected `(connection_id, device_id)` pair is not present in available counters.
   */
  const queryClient = useQueryClient();
  const loggerList = useMemo(
    () => queryClient.getQueryData<LoggerList>(["logger-list"]) ?? [],
    [queryClient],
  );

  /**
   * availableCountersList
   *
   * Backend-provided list of available counters.
   *
   * Notes:
   * - Query is enabled only for logger type "mbox".
   * - `type` is included in queryKey to avoid mixing results across types.
   */
  const {
    data: availableCountersList,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["mbox-available-counters", type],
    queryFn: getMboxAvailableCounters,
    enabled: type === "mbox",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const counters = useMemo(
    () => availableCountersList?.data ?? [],
    [availableCountersList?.data],
  );

  /**
   * CounterOption
   *
   * Runtime option type derived from backend counter list.
   *
   * Additional field:
   * - __inUse: marks a synthetic option representing a currently assigned but
   *   unavailable counter (e.g. in use by another process/logger).
   */
  type CounterOption = (typeof counters)[number] & { __inUse?: boolean };

  /**
   * makeCombo
   *
   * Helper to encode `(connection_id, device_id)` into a single Select value.
   */
  const makeCombo = (connId: number, devId: number) => `${connId}:${devId}`;

  /**
   * inUseOption
   *
   * Synthetic option injected when:
   * - ext counter is enabled
   * - user has a saved `(connection_id, device_id)` pair
   * - the pair is NOT present in `counters` returned from backend
   *
   * Data source:
   * - The option is reconstructed from cached `loggerList`, looking up:
   *   - logger of type "mbox_counter" with id === selectedConnectionId
   *   - matching device by `device_id`
   *
   * Notes:
   * - This keeps the UI stable when editing an existing logger whose counter
   *   is temporarily unavailable.
   */
  const inUseOption = useMemo<CounterOption | null>(() => {
    if (!extCounterEnabled) return null;
    if (typeof selectedConnectionId !== "number") return null;
    if (typeof currentDeviceId !== "number") return null;

    const existsInAvailable = counters.some(
      (c) =>
        c.counter_connection_id === selectedConnectionId &&
        c.device_id === currentDeviceId,
    );
    if (existsInAvailable) return null;

    const counterLogger = loggerList.find(
      (l) => l.type === "mbox_counter" && l.id === selectedConnectionId,
    );

    const device = counterLogger?.mbox_counter?.devices?.find(
      (d) => d.device_id === currentDeviceId,
    );

    return {
      counter_connection_id: selectedConnectionId,
      counter_connection_name:
        counterLogger?.name ?? `Counter #${selectedConnectionId}`,
      device_id: currentDeviceId,
      device_name: device?.name ?? `Device #${currentDeviceId}`,
      serial: device?.serial ?? 0,
      runtime_state: "in_use",
      total_count: 0,
      __inUse: true,
    } as CounterOption;
  }, [
    extCounterEnabled,
    selectedConnectionId,
    currentDeviceId,
    counters,
    loggerList,
  ]);

  /**
   * counterOptions
   *
   * Final options list displayed in the select:
   * - available counters from backend
   * - plus optional injected `inUseOption` at the top
   */
  const counterOptions: CounterOption[] = useMemo(
    () => (inUseOption ? [inUseOption, ...counters] : counters),
    [inUseOption, counters],
  );

  /**
   * Reset values and validation when external counter is disabled.
   *
   * Behavior:
   * - Clear errors for all dependent paths.
   * - Restore defaults from `MBOX_COUNTER_DEFAULTS`.
   */
  useEffect(() => {
    if (!extCounterEnabled) {
      clearErrors(MBOX_COUNTER_DEFAULT_PATHS.map(([path]) => path));
      MBOX_COUNTER_DEFAULT_PATHS.forEach(([path, value]) => {
        setValue(path, value);
      });
    }
  }, [extCounterEnabled, clearErrors, setValue]);

  /**
   * Ensure `(connection_id, device_id)` pair remains valid when ext counter is enabled.
   *
   * If current pair is invalid or incomplete:
   * - select the first available device for the chosen connection id
   *
   * Notes:
   * - This prevents situations where connection id is set but device id
   *   does not match any known option.
   */
  useEffect(() => {
    if (!extCounterEnabled) return;
    if (typeof selectedConnectionId !== "number") return;

    const pairIsValid =
      typeof currentDeviceId === "number" &&
      counterOptions.some(
        (c) =>
          c.counter_connection_id === selectedConnectionId &&
          c.device_id === currentDeviceId,
      );

    if (pairIsValid) return;

    const firstForConn = counters.find(
      (c) => c.counter_connection_id === selectedConnectionId,
    );
    if (!firstForConn) return;

    setValue("mbox.counter_device_id", firstForConn.device_id ?? null, {
      shouldValidate: true,
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [
    extCounterEnabled,
    selectedConnectionId,
    currentDeviceId,
    counters,
    counterOptions,
    setValue,
  ]);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          borderTop: "var(--border-standart)",
          paddingBlock: "var(--pading-equal) 1.2rem",
        }}
      >
        <Controller
          name="mbox.ext_counter"
          control={control}
          render={({ field }) => (
            <FormRow label="Ext-counter" labelWidth="25%">
              <FormCheckbox
                id="mbox-ext-counter"
                checked={!!field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                sx={{ mb: "0.8rem" }}
              />
            </FormRow>
          )}
        />

        <FormRow label="Counter connection" labelWidth="25%">
          <FormControl fullWidth>
            <Controller
              name="mbox.counter_connection_id"
              control={control}
              rules={{
                required: extCounterEnabled
                  ? "Required when ext counter enabled"
                  : false,
                validate: (val) => {
                  if (!extCounterEnabled) return true;
                  if (typeof val !== "number") return "Select connection";
                  if (val <= 0) return "Select connection";
                  return true;
                },
              }}
              render={({ field, fieldState }) => {
                const comboValue =
                  extCounterEnabled &&
                  typeof selectedConnectionId === "number" &&
                  typeof currentDeviceId === "number" &&
                  counterOptions.some(
                    (c) =>
                      c.counter_connection_id === selectedConnectionId &&
                      c.device_id === currentDeviceId,
                  )
                    ? makeCombo(selectedConnectionId, currentDeviceId)
                    : "";

                return (
                  <>
                    <FormSelect
                      name={field.name}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      displayEmpty
                      disabled={!extCounterEnabled || isLoading || isError}
                      variant="outlined"
                      value={comboValue}
                      onChange={(e) => {
                        const raw = String(e.target.value);

                        if (raw === "") {
                          field.onChange(null);
                          setValue("mbox.counter_device_id", null, {
                            shouldValidate: true,
                            shouldDirty: true,
                            shouldTouch: true,
                          });
                          return;
                        }

                        const [connStr, devStr] = raw.split(":");
                        const connectionId = Number(connStr);
                        const deviceId = Number(devStr);

                        field.onChange(connectionId);
                        setValue("mbox.counter_device_id", deviceId, {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    >
                      <MenuItem value="">
                        {isLoading
                          ? "Loading..."
                          : isError
                            ? "Failed to load"
                            : "Select counter"}
                      </MenuItem>

                      {counterOptions.map((c, i) => (
                        <MenuItem
                          key={`${c.counter_connection_id}-${c.device_id}-${
                            c.serial ?? "na"
                          }-${i}`}
                          value={makeCombo(
                            c.counter_connection_id,
                            c.device_id,
                          )}
                        >
                          {`${c.device_name} (${c.counter_connection_id} : ${
                            c.device_id
                          }${c.serial != null ? ` : ${c.serial}` : ""})${
                            c.__inUse ? " (in use)" : ""
                          }`}
                        </MenuItem>
                      ))}
                    </FormSelect>

                    <HelperText>
                      {fieldState.error?.message ??
                        (isError ? "Failed to load counters" : " ")}
                    </HelperText>
                  </>
                );
              }}
            />
          </FormControl>
        </FormRow>

        <Controller
          name="mbox.counter_device_id"
          control={control}
          rules={{
            required: extCounterEnabled
              ? "Required when ext counter enabled"
              : false,
            validate: (val) => {
              if (typeof val !== "number") return true;
              if (val <= 0) return "Id must be greater than 0";
              if (!Number.isInteger(val)) return "Id must be an integer";
              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Device id" labelWidth="25%">
              <FormInput
                {...field}
                type="number"
                id="mbox-device-id"
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                disabled={!extCounterEnabled}
                slotProps={{ htmlInput: { step: 1, min: 1 } }}
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.counter_clean_timeout"
          control={control}
          rules={{
            required: extCounterEnabled
              ? "Required when ext counter enabled"
              : false,
            min: { value: 0.1, message: "Clean timeout must be ≥ 0.1" },
            validate: (value) =>
              hasMax2Decimals(value) ||
              "Clean timeout can have at most 2 decimal places",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Clean timeout" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                type="number"
                id="mbox-clean-timeout"
                onChange={makeNumberChangeHandler(field)}
                disabled={!extCounterEnabled}
                slotProps={{ htmlInput: { min: "0.1", step: "any" } }}
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.counter_miss_timeout"
          control={control}
          rules={{
            required: extCounterEnabled
              ? "Required when ext counter enabled"
              : false,
            min: { value: 0.1, message: "Miss timeout must be ≥ 0.1" },
            validate: (value) =>
              hasMax2Decimals(value) ||
              "Miss timeout can have at most 2 decimal places",
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Miss timeout" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                type="number"
                id="mbox-miss-timeout"
                onChange={makeNumberChangeHandler(field)}
                disabled={!extCounterEnabled}
                slotProps={{ htmlInput: { min: "0.1", step: "any" } }}
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <FormRow label="Strategy" labelWidth="25%">
          <FormControl fullWidth>
            <Controller
              name="mbox.miss_strategy"
              control={control}
              rules={{
                required: extCounterEnabled
                  ? "Required when ext counter enabled"
                  : false,
              }}
              render={({ field, fieldState }) => (
                <>
                  <FormSelect
                    {...field}
                    disabled={!extCounterEnabled}
                    variant="outlined"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {strategy.map((val) => (
                      <MenuItem key={val} value={val}>
                        {val}
                      </MenuItem>
                    ))}
                  </FormSelect>
                  <HelperText>{fieldState.error?.message ?? " "}</HelperText>
                </>
              )}
            />
          </FormControl>
        </FormRow>

        <Controller
          name="mbox.miss_insert_limit"
          control={control}
          rules={{
            required: extCounterEnabled
              ? "Required when ext counter enabled"
              : false,
            validate: (val) => {
              if (typeof val !== "number") return true;
              if (val <= 0) return "Insert limit must be greater than 0";
              if (!Number.isInteger(val))
                return "Insert limit must be an integer";
              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Insert limit" labelWidth="25%">
              <FormInput
                {...field}
                type="number"
                id="mbox-insert-limit"
                value={field.value ?? ""}
                onChange={makeNumberChangeHandler(field)}
                disabled={!extCounterEnabled}
                slotProps={{ htmlInput: { step: 1, min: 1 } }}
                fullWidth
                helperText={fieldState.error?.message ?? " "}
              />
            </FormRow>
          )}
        />

        <Controller
          name="mbox.miss_error_label"
          control={control}
          rules={{
            required: extCounterEnabled
              ? "Required when ext counter enabled"
              : false,
          }}
          render={({ field, fieldState }) => (
            <FormRow label="Error label" labelWidth="25%">
              <FormInput
                {...field}
                value={field.value ?? ""}
                id="mbox-error-label"
                disabled={!extCounterEnabled}
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
    </>
  );
}
