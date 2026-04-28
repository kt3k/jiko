import { assertRejects } from "@std/assert";
import { closeDb, executeQuery } from "./db.ts";

Deno.test("executeQuery rejects non-SELECT statements", async () => {
  await assertRejects(
    () => executeQuery("DROP TABLE accidents"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  await assertRejects(
    () => executeQuery("DELETE FROM accidents"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  await assertRejects(
    () => executeQuery("UPDATE accidents SET year=2025"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  await assertRejects(
    () => executeQuery("INSERT INTO accidents VALUES (1)"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  closeDb();
});

Deno.test("executeQuery rejects SELECT with forbidden keywords", async () => {
  await assertRejects(
    () =>
      executeQuery(
        "SELECT * FROM accidents; DROP TABLE accidents",
      ),
    Error,
    "禁止されたキーワードが含まれています。",
  );
  closeDb();
});
