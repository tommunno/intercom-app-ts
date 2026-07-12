import type Database from "better-sqlite3";

interface ForeignKeyViolation {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
}

export function validateDatabase(db: Database.Database): void {
  const violations = db.pragma("foreign_key_check") as ForeignKeyViolation[];

  if (violations.length > 0) {
    throw new Error(
      [
        "Database contains foreign-key violations.",
        ...violations.map(
          (violation) =>
            `- Table "${violation.table}", rowid ${violation.rowid ?? "unknown"}, parent "${violation.parent}", foreign key ${violation.fkid}`,
        ),
      ].join("\n"),
    );
  }
}
