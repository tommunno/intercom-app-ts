import type { Migration } from "../../types/Migration.js";

export const initialSchema: Migration = {
  id: "20260710225654_initial_schema",
  up: `
    CREATE TABLE app_state (
      key TEXT PRIMARY KEY,
      json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      to_admin_panel INTEGER NOT NULL CHECK (to_admin_panel IN (0, 1)),
      context TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `,
};
