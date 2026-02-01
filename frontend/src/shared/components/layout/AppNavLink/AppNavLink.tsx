import styles from "./AppNavLink.module.css";

import { NavLink } from "react-router";

import clsx from "clsx";

/**
 * src/shared/components/layout/AppNavLink/AppNavLink.tsx
 *
 * Styled navigation link component for the application sidebar/navigation.
 *
 * Responsibilities:
 * - Wrap react-router's NavLink with application-specific styling
 * - Apply active state styles based on the current route
 * - Provide a simple, consistent API for navigation links
 *
 * Design notes:
 * - Uses react-router's NavLink to automatically track active routes
 * - `clsx` is used to conditionally apply CSS module classes
 * - Keeps routing logic and styling concerns encapsulated in one place
 *
 * Styling:
 * - `styles.link` is always applied
 * - `styles.active` is applied only when the link matches the current route
 *
 * Usage:
 *   <AppNavLink to="/loggers">Loggers</AppNavLink>
 */

/* --------------------------------- Props ---------------------------------- */
/**
 * AppNavLinkProps
 *
 * @property to        - Target route path
 * @property children - Link content (text, icon, or both)
 */

type AppNavLinkProps = {
  to: string;
  children: React.ReactNode;
};

/* ------------------------------ Component ---------------------------------- */
export function AppNavLink({ to, children }: AppNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => clsx(styles.link, isActive && styles.active)}
    >
      {children}
    </NavLink>
  );
}
