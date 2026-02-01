import { styled, Tabs, Tab } from "@mui/material";

/**
 * src/shared/components/ui/tab/TabStyled.tsx
 *
 * Styled tab components used for settings and configuration sections.
 *
 * Responsibilities:
 * - Provide application-specific visual styling for MUI Tabs and Tab components
 * - Enforce consistent spacing, typography, and color scheme across tabbed layouts
 *
 * Design notes:
 * - These components do not add behavior, only styling
 * - Built using MUI's `styled` API to wrap base Tabs and Tab components
 * - Intended to be used together as a pair (`SettingsTabs` + `SettingsTab`)
 *
 * Styling highlights:
 * - Reduced vertical height for compact layouts
 * - Custom indicator with rounded corners and mint accent color
 * - Tabs use secondary font and disable uppercase transformation
 * - Selected tab is highlighted with background and accent color
 */

/**
 * SettingsTabs
 *
 * Styled wrapper around MUI Tabs.
 * Controls spacing between tabs and appearance of the indicator.
 */
export const SettingsTabs = styled(Tabs)({
  minHeight: 0,
  "& .MuiTabs-flexContainer": {
    gap: "var(--gap-standart)",
  },
  "& .MuiTabs-indicator": {
    height: "0.2rem",
    borderRadius: "var(--border-radius-main)",
    backgroundColor: "var(--color-mint)",
  },
});

/**
 * SettingsTab
 *
 * Styled wrapper around MUI Tab.
 * Represents an individual tab within SettingsTabs.
 */
export const SettingsTab = styled(Tab)({
  textTransform: "none",
  fontFamily: "var(--secondary-font)",
  fontSize: "var(--medium-font-size)",
  minHeight: 0,
  padding: "0.4rem 1rem",
  borderRadius: "var(--border-radius-main)",
  alignSelf: "flex-start",
  color: "var(--color-gunmetal)",
  "&.Mui-selected": {
    backgroundColor: "var(--color-mint-cream)",
    color: "var(--color-indian-red)",
  },
});
