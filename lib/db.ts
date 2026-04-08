import { DatabaseSync } from "node:sqlite";

export const DB_PATH = Deno.env.get("SQLITE_PATH") ?? "./accidents.db";

let db: DatabaseSync | null = null;

/** シングルトンで SQLite 接続を返す */
export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
  }
  return db;
}

const FORBIDDEN_PATTERN = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\b/i;
const MAX_ROWS = 100;

/**
 * SELECT クエリを実行して結果を返す。
 * SELECT 以外の文や危険なキーワードを含むクエリは拒否する。
 */
export function executeQuery(sql: string): Record<string, unknown>[] {
  const trimmed = sql.trim();
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error("SELECT 文のみ実行可能です。");
  }
  if (FORBIDDEN_PATTERN.test(trimmed)) {
    throw new Error("禁止されたキーワードが含まれています。");
  }
  const results = getDb().prepare(trimmed).all() as Record<string, unknown>[];
  return results.slice(0, MAX_ROWS);
}
