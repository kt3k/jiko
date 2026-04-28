import { DatabaseSync } from "node:sqlite";

const DB_PATH = Deno.env.get("SQLITE_PATH") ?? "./accidents.db";
let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) db = new DatabaseSync(DB_PATH);
  return db;
}

interface Request {
  id: number;
  sql: string;
  maxRows: number;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, sql, maxRows } = e.data;
  try {
    const rows = (getDb().prepare(sql).all() as Record<string, unknown>[])
      .slice(
        0,
        maxRows,
      );
    self.postMessage({ id, rows });
  } catch (err) {
    self.postMessage({ id, error: (err as Error).message });
  }
};
