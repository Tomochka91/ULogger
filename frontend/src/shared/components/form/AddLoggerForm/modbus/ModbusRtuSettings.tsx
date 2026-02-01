import { useState, type SyntheticEvent } from "react";
import { Box } from "@mui/material";

import { SettingsTab, SettingsTabs } from "../../../ui/tab/TabStyled";
import { ComPortTab } from "../tabSettings/ComPortTab";
import { PollIntervalTab } from "../tabSettings/PollIntervalTab";
import { SlavesTab } from "../tabSettings/SlavesTab/SlavesTab";
import { DBWriterTab } from "../tabSettings/DBWriterTab";

/**
 * src/shared/components/form/AddLoggerForm/modbus/ModbusRtuSettings.tsx
 *
 * Modbus RTU logger settings container.
 *
 * This module renders the tabbed settings UI for the Modbus RTU logger.
 * It combines all Modbus RTU–specific configuration sections into a single view.
 *
 * Responsibilities:
 * - Manage active settings tab state
 * - Render Modbus RTU configuration tabs:
 *   - Com port settings
 *   - Poll interval
 *   - Slaves configuration
 *   - Database writer settings
 *
 * Design notes:
 * - Uses local component state to control active tab.
 * - Tab content is conditionally rendered using CSS
 *   (`display: contents | none`) to preserve layout grid structure.
 * - All form bindings are handled inside individual tab components.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * ModbusRtuSettings
 *
 * Tabbed settings editor for the Modbus RTU logger type.
 *
 * Tabs:
 * - "com-port": serial port configuration (`ComPortTab`)
 * - "poll interval": polling interval (`PollIntervalTab`)
 * - "slaves": Modbus slaves configuration (`SlavesTab`)
 * - "db-writer": database writer configuration (`DBWriterTab`)
 *
 * Notes:
 * - The component does not interact with React Hook Form directly.
 * - Form state is managed by child tab components.
 */

export function ModbusRtuSettings() {
  const [tab, setTab] = useState(0);

  /**
   * handleTabChange
   *
   * Updates active settings tab.
   */
  const handleTabChange = (_e: SyntheticEvent, tabValue: number) => {
    setTab(tabValue);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <SettingsTabs value={tab} onChange={handleTabChange}>
        <SettingsTab label="com-port" />
        <SettingsTab label="poll interval" />
        <SettingsTab label="slaves" />
        <SettingsTab label="db-writer" />
      </SettingsTabs>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr min-content 1fr",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <Box sx={{ display: tab === 0 ? "contents" : "none" }}>
          <ComPortTab fieldPrefix="modbus_rtu" />
        </Box>

        <Box sx={{ display: tab === 1 ? "contents" : "none" }}>
          <PollIntervalTab fieldPrefix="modbus_rtu" />
        </Box>

        <Box sx={{ display: tab === 2 ? "contents" : "none" }}>
          <SlavesTab fieldPrefix="modbus_rtu" />
        </Box>

        <Box sx={{ display: tab === 3 ? "contents" : "none" }}>
          <DBWriterTab />
        </Box>
      </Box>
    </Box>
  );
}
