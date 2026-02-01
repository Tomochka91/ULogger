import { useState, type SyntheticEvent } from "react";
import { Box } from "@mui/material";

import { SettingsTab, SettingsTabs } from "../../../ui/tab/TabStyled";
import { DBWriterTab } from "../tabSettings/DBWriterTab";
import { ComPortTab } from "../tabSettings/ComPortTab";
import { ProcessingTab } from "../tabSettings/ProcessingTab";
import { CounterTab } from "../tabSettings/CounterTab";
import { MissDefaultTab } from "../tabSettings/MissDefaultTab";

/**
 * src/shared/components/form/AddLoggerForm/mbox/MboxSettings.tsx
 *
 * MBox logger settings container.
 *
 * This module renders the tabbed settings UI for the MBox logger.
 * It combines multiple MBox-specific tab sections into a single view.
 *
 * Responsibilities:
 * - Manage active settings tab state
 * - Render MBox configuration tabs:
 *   - Com port settings
 *   - External counter settings
 *   - Processing settings
 *   - Database writer settings
 *   - Miss-default values
 *
 * Design notes:
 * - Uses local component state to control active tab.
 * - Tab content is conditionally rendered using CSS
 *   (`display: contents | none`) to preserve layout grid structure.
 * - Form bindings are handled inside individual tab components.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * MboxSettings
 *
 * Tabbed settings editor for the MBox logger type.
 *
 * Tabs:
 * - "com-port": serial port configuration (`ComPortTab`)
 * - "counter": external counter integration (`CounterTab`)
 * - "processing": processing and error handling (`ProcessingTab`)
 * - "db-writer": database writer configuration (`DBWriterTab`)
 * - "miss default": fallback values for missed packets (`MissDefaultTab`)
 *
 * Notes:
 * - The component does not interact with React Hook Form directly;
 *   form bindings are delegated to child tab components.
 */

export function MboxSettings() {
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
        <SettingsTab label="counter" />
        <SettingsTab label="processing" />
        <SettingsTab label="db-writer" />
        <SettingsTab label="miss default" />
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
          <ComPortTab fieldPrefix="mbox" />
        </Box>

        <Box sx={{ display: tab === 1 ? "contents" : "none" }}>
          <CounterTab />
        </Box>

        <Box sx={{ display: tab === 2 ? "contents" : "none" }}>
          <ProcessingTab />
        </Box>

        <Box sx={{ display: tab === 3 ? "contents" : "none" }}>
          <DBWriterTab />
        </Box>

        <Box sx={{ display: tab === 4 ? "contents" : "none" }}>
          <MissDefaultTab />
        </Box>
      </Box>
    </Box>
  );
}
