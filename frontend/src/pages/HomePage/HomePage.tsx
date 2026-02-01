import styles from "./HomePage.module.css";

import fishIcon from "../../shared/icons/fish.svg";

/**
 * src/pages/HomePage.tsx
 *
 * Application home (landing) page.
 *
 * Responsibilities:
 * - Serve as the visual entry point of the application
 * - Display branding elements (logo/icon and title)
 * - Provide a clean, minimal first impression
 *
 * Design notes:
 * - This page is intentionally static and contains no business logic
 * - No API calls, state, or side effects are used here
 * - Acts as a branding / splash-style page rather than a dashboard
 *
 * UI structure:
 * - <section> wrapper for page-level layout
 * - Decorative fish icon (SVG)
 * - Stylized application title with accent-highlighted letters
 *
 * Styling:
 * - Uses CSS Modules (HomePage.module.css)
 * - `wrapper` controls centering and layout
 * - `image` styles the SVG icon
 * - `title` and `accent` handle typography and brand emphasis
 *
 * Assets:
 * - `fish.svg` is imported as a static asset and rendered via <img>
 */

export function HomePage() {
  return (
    <section className={styles.wrapper}>
      <img src={fishIcon} alt="Fish image" className={styles.image} />
      <h1 className={styles.title}>
        Lo<span className={styles.accent}>g</span>
        <span className={styles.accent}>g</span>er
      </h1>
    </section>
  );
}
