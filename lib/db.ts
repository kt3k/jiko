export const DB_PATH = Deno.env.get("SQLITE_PATH") ?? "./accidents.db";

const FORBIDDEN_PATTERN = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\b/i;
const MAX_ROWS = 100;

interface Pending {
  resolve: (rows: Record<string, unknown>[]) => void;
  reject: (err: Error) => void;
}

interface Response {
  id: number;
  rows?: Record<string, unknown>[];
  error?: string;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(
    new URL("./db_worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (e: MessageEvent<Response>) => {
    const { id, rows, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(rows ?? []);
  };
  return worker;
}

/**
 * SELECT クエリを Worker 上で実行して結果を返す。
 * バリデーションはメインスレッドで先に行い、危険なクエリは Worker に渡さない。
 */
export async function executeQuery(
  sql: string,
): Promise<Record<string, unknown>[]> {
  const trimmed = sql.trim();
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error("SELECT 文のみ実行可能です。");
  }
  if (FORBIDDEN_PATTERN.test(trimmed)) {
    throw new Error("禁止されたキーワードが含まれています。");
  }
  const id = nextId++;
  return await new Promise<Record<string, unknown>[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, sql: trimmed, maxRows: MAX_ROWS });
  });
}

/** Worker を終了する。テスト後のクリーンアップ用。 */
export function closeDb() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  for (const p of pending.values()) {
    p.reject(new Error("DB worker terminated"));
  }
  pending.clear();
}
