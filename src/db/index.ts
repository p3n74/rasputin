import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { schema } from "./schema.js";

export type Database = LibSQLDatabase<typeof schema>;

function filePathFromUrl(url: string): string | undefined {
  if (!url.startsWith("file:")) {
    return undefined;
  }
  const path = url.slice("file:".length);
  if (path.startsWith("//")) {
    return path.slice(2);
  }
  return path;
}

export function createDatabase(databaseUrl: string): {
  client: Client;
  db: Database;
} {
  const filePath = filePathFromUrl(databaseUrl);
  if (filePath) {
    mkdirSync(dirname(filePath), { recursive: true });
  }

  const client = createClient({ url: databaseUrl });
  const db = drizzle(client, { schema });
  return { client, db };
}

export function migrationsFolder(): string {
  return fileURLToPath(new URL("../../drizzle", import.meta.url));
}
