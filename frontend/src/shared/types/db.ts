/**
 * Database connection settings.
 *
 * Used in DB connection forms and API requests.
 */

export type DBSettings = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslmode?:
    | "disable"
    | "allow"
    | "prefer"
    | "require"
    | "verify-ca"
    | "verify-full";
};

/**
 * Database action type.
 *
 * - "test": test connection
 * - "save": save settings
 */

export type DBaction = "test" | "save";
