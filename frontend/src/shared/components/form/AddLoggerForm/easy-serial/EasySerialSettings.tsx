import { useState, type SyntheticEvent } from "react";
import { Box } from "@mui/material";

import { SettingsTab, SettingsTabs } from "../../../ui/tab/TabStyled";
import { ComPortTab } from "../tabSettings/ComPortTab";
import { FramerTab } from "../tabSettings/FramerTab";
import { DBWriterTab } from "../tabSettings/DBWriterTab";

/**
 * src/shared/components/form/AddLoggerForm/easy-serial/EasySerialSettings.tsx
 *
 * EasySerial logger settings container.
 *
 * This module renders the tabbed settings UI for the EasySerial logger.
 * It combines multiple tab sections into a single settings view.
 *
 * Responsibilities:
 * - Manage active settings tab state
 * - Render EasySerial-specific configuration tabs:
 *   - Com port settings
 *   - Framer / parser settings
 *   - Database writer settings
 *
 * Design notes:
 * - Uses local component state to control active tab.
 * - Tab content is conditionally rendered using CSS (`display: contents | none`)
 *   to preserve layout grid structure.
 * - Actual form bindings are handled inside individual tab components.
 */

/* -------------------------------- Component -------------------------------- */
/**
 * EasySerialSettings
 *
 * Tabbed settings editor for the EasySerial logger type.
 *
 * Tabs:
 * - "com-port": serial port configuration (`ComPortTab`)
 * - "framer/parser": message framing and parsing (`FramerTab`)
 * - "db-writer": database writer configuration (`DBWriterTab`)
 *
 * Notes:
 * - The component does not interact with React Hook Form directly;
 *   form bindings are delegated to child tab components.
 */

export function EasySerialSettings() {
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
        <SettingsTab label="framer/parser" />
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
          <ComPortTab fieldPrefix="easy_serial" />
        </Box>

        <Box sx={{ display: tab === 1 ? "contents" : "none" }}>
          <FramerTab />
        </Box>

        <Box sx={{ display: tab === 2 ? "contents" : "none" }}>
          <DBWriterTab />
        </Box>
      </Box>
    </Box>
  );
}
