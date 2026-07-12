import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { migrations } from "./migrations.js";

interface AppliedMigration {
  id: string;
  checksum: string;
}

function calculateChecksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const getAppliedMigrations = db.prepare<[], AppliedMigration>(`
    SELECT id, checksum
    FROM migrations
  `);

  const recordMigration = db.prepare<[string, string]>(`
    INSERT INTO migrations (id, checksum)
    VALUES (?, ?)
  `);

  const appliedMigrations = new Map<string, string>(
    getAppliedMigrations
      .all()
      .map((migration) => [migration.id, migration.checksum]),
  );

  const sortedMigrations = migrations.toSorted((a, b) =>
    a.id.localeCompare(b.id),
  );

  const seenMigrationIds = new Set<string>();
  for (const migration of sortedMigrations) {
    if (seenMigrationIds.has(migration.id)) {
      throw new Error(`Duplicate migration id: ${migration.id}`);
    }
    seenMigrationIds.add(migration.id);

    const recordedChecksum = appliedMigrations.get(migration.id);

    if (recordedChecksum === undefined) {
      continue;
    }

    const currentChecksum = calculateChecksum(migration.up);

    if (recordedChecksum !== currentChecksum) {
      throw new Error(
        [
          `Migration checksum mismatch: ${migration.id}`,
          `Recorded checksum: ${recordedChecksum}`,
          `Current checksum:  ${currentChecksum}`,
          "An already-applied migration appears to have been modified.",
        ].join("\n"),
      );
    }
  }

  const unknownAppliedMigrationIds: string[] = [];
  appliedMigrations.forEach((_, aId) => {
    if (!seenMigrationIds.has(aId)) {
      unknownAppliedMigrationIds.push(aId);
    }
  });
  if (unknownAppliedMigrationIds.length > 0) {
    throw new Error(
      [
        "The database contains migrations that this application version does not recognise.",
        "The database may have been updated by a newer application version, or a migration may have been removed or renamed.",
        "",
        "Unknown applied migrations:",
        ...unknownAppliedMigrationIds
          .toSorted((a, b) => a.localeCompare(b))
          .map((migrationId) => `- ${migrationId}`),
        "",
        "Refusing to start to avoid using a newer database schema with older application code.",
      ].join("\n"),
    );
  }

  const pendingMigrations = sortedMigrations.filter(
    (migration) => !appliedMigrations.has(migration.id),
  );

  if (pendingMigrations.length === 0) {
    console.log("Database is up to date.");
    return;
  }

  const applyMigrations = db.transaction(() => {
    for (const migration of pendingMigrations) {
      const checksum = calculateChecksum(migration.up);

      console.log(`Running migration: ${migration.id}`);

      db.exec(migration.up);
      recordMigration.run(migration.id, checksum);
    }
  });

  try {
    applyMigrations.immediate();

    console.log(
      `Successfully applied ${pendingMigrations.length} migration${
        pendingMigrations.length === 1 ? "" : "s"
      }.`,
    );
  } catch (error) {
    console.error("Fatal error while running database migrations.");
    console.error("The migration transaction was rolled back.");
    console.error(error);

    throw error;
  }
}
