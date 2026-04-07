import { assertThrows } from "@std/assert";
import { executeQuery } from "./db.ts";

Deno.test("executeQuery rejects non-SELECT statements", () => {
  assertThrows(
    () => executeQuery("DROP TABLE accidents"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  assertThrows(
    () => executeQuery("DELETE FROM accidents"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  assertThrows(
    () => executeQuery("UPDATE accidents SET year=2025"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
  assertThrows(
    () => executeQuery("INSERT INTO accidents VALUES (1)"),
    Error,
    "SELECT 文のみ実行可能です。",
  );
});

Deno.test("executeQuery rejects SELECT with forbidden keywords", () => {
  assertThrows(
    () =>
      executeQuery(
        "SELECT * FROM accidents; DROP TABLE accidents",
      ),
    Error,
    "禁止されたキーワードが含まれています。",
  );
});
