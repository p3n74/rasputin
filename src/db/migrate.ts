import { migrate } from "drizzle-orm/libsql/migrator";
import type { Database } from "./index.js";
import { migrationsFolder } from "./index.js";

export async function applyMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsFolder() });
}
