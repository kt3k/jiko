import { DatabaseSync } from "node:sqlite";

const DB_PATH = Deno.env.get("SQLITE_PATH") ?? "./accidents.db";

let db: DatabaseSync | null = null;

/** シングルトンで SQLite 接続を返す */
export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
  }
  return db;
}
