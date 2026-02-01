import styles from "./Logo.module.css";

import { Link } from "react-router";

import clsx from "clsx";

/**
 * src/shared/components/layout/Logo/Logo.tsx
 *
 * Application logo component.
 *
 * Responsibilities:
 * - Display the application brand name ("Fish Logger")
 * - Act as a navigational element linking to the home page
 * - Apply brand-specific typography and color accents
 *
 * Design notes:
 * - The logo is implemented as a clickable link using react-router's <Link>
 * - Styling is split into semantic parts (accent / secondary) to allow
 *   visual emphasis and theming
 * - No state or business logic is present; this is a purely presentational component
 *
 * UI structure:
 * - <Link to="/"> wraps the entire logo, making it clickable
 * - Container groups the two text spans
 * - "Fish" and "Logger" are rendered as separate spans for styling flexibility
 *
 * Styling:
 * - Uses CSS Modules (Logo.module.css)
 * - `container` controls layout/alignment
 * - `logo` defines base typography
 * - `accent` and `secondary` apply brand colors or variations
 *
 * Usage:
 *   <Logo />
 * Typically placed in the sidebar or header as a brand anchor.
 */

export function Logo() {
  return (
    <Link to="/">
      <div className={styles.container}>
        <span className={clsx(styles.logo, styles.accent)}>Fish</span>
        <span className={clsx(styles.logo, styles.secondary)}>Logger</span>
      </div>
    </Link>
  );
}
