import { useState, type SyntheticEvent } from "react";
import { Box } from "@mui/material";

import { SettingsTab, SettingsTabs } from "../../../ui/tab/TabStyled";
import { ComPortTab } from "../tabSettings/ComPortTab";
import { PollIntervalTab } from "../tabSettings/PollIntervalTab";
import { DevicesTab } from "../tabSettings/DevicesTab";

/**
 * src/shared/components/form/AddLoggerForm/mbox/MboxCounterSettings.tsx
 *
 * MBox Counter logger settings container.
 *
 * This module renders the tabbed settings UI for the MBox Counter logger.
 *
 * Responsibilities:
 * - Manage active settings tab state
 * - Render MBox Counter–specific configuration tabs:
 *   - Com port settings
 *   - Poll interval
 *   - Devices list
 *
 * Design notes:
 * - Uses local component state to control active tab.
 * - Tab content is conditionally rendered using CSS
 *   (`display: contents | none`) to preserve layout grid structure.
 * - Form bindings are handled inside individual tab components.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * MboxCounterSettings
 *
 * Tabbed settings editor for the MBox Counter logger type.
 *
 * Tabs:
 * - "com-port": serial port configuration (`ComPortTab`)
 * - "poll interval": polling interval (`PollIntervalTab`)
 * - "devices": counter devices configuration (`DevicesTab`)
 *
 * Notes:
 * - Does not interact with React Hook Form directly.
 * - All form logic is delegated to child tab components.
 */

export function MboxCounterSettings() {
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
        <SettingsTab label="devices" />
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
          <ComPortTab fieldPrefix="mbox_counter" />
        </Box>

        <Box sx={{ display: tab === 1 ? "contents" : "none" }}>
          <PollIntervalTab fieldPrefix="mbox_counter" />
        </Box>

        <Box sx={{ display: tab === 2 ? "contents" : "none" }}>
          <DevicesTab />
        </Box>
      </Box>
    </Box>
  );
}
