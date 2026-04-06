import { assertEquals } from "@std/assert";
import { DatabaseSync } from "node:sqlite";
import { importCsv, initDb, parseRow } from "./import-csv.ts";

// --- parseRow tests (5 random CSV samples) ---

Deno.test("parseRow - random CSV row 1: Chiba traffic accident", () => {
  const cols =
    "1,44,101,0224,2,000,001,30000,0000,101,2024,06,04,22,19,22,04,24,18,52,1,2,1,01,1,09,22,09,22,14,9,30,70,5,1,21,25,45,03,13,31,31,01,11,2,2,11,11,02,03,28,10,1,1,2,2,2,2,4,2,353546577,1400725082,3,3,9999,9999,1,9"
      .split(",");
  const row = parseRow(cols);
  assertEquals(row[0], "千葉"); // prefecture
  assertEquals(row[1], "44"); // prefecture_code
  assertEquals(row[3], "負傷"); // severity
  assertEquals(row[4], 0); // fatalities
  assertEquals(row[5], 1); // injuries
  assertEquals(row[7], 2024); // year
  assertEquals(row[8], 6); // month
  assertEquals(row[9], 4); // day
  assertEquals(row[10], 22); // hour
  assertEquals(row[11], 19); // minute
  assertEquals(row[12], "夜-夜"); // day_night
  assertEquals(row[13], "晴"); // weather
  assertEquals(row[14], "市街地-その他"); // terrain
  assertEquals(row[15], "舗装-乾燥"); // road_surface
  assertEquals(row[16], "交差点-その他"); // road_shape
  assertEquals(row[17], "点灯-3灯式"); // traffic_signal
  assertEquals(row[18], "車両相互"); // accident_type
  assertEquals(row[19], 25); // party_a_age
  assertEquals(row[20], 45); // party_b_age
  assertEquals(row[21], "乗用車-普通車"); // party_a_type
  assertEquals(row[22], "貨物車-普通車"); // party_b_type
  assertEquals(row[23], "損傷なし"); // party_a_injury
  assertEquals(row[24], "負傷"); // party_b_injury
  assertEquals(typeof row[25], "number"); // latitude
  assertEquals(typeof row[26], "number"); // longitude
  assertEquals(row[27], "火"); // day_of_week
  assertEquals(row[28], 0); // is_holiday
});

Deno.test("parseRow - random CSV row 2: Osaka traffic accident", () => {
  const cols =
    "1,62,203,0338,2,000,001,30990,0000,205,2024,05,30,08,29,12,04,47,19,05,1,2,1,14,7,00,00,00,00,03,9,01,70,5,1,21,25,45,03,52,31,41,01,00,1,0,11,00,10,00,18,12,3,3,2,0,2,0,4,2,344557182,1353112172,5,3,9999,0000,1,0"
      .split(",");
  const row = parseRow(cols);
  assertEquals(row[0], "大阪");
  assertEquals(row[3], "負傷");
  assertEquals(row[7], 2024);
  assertEquals(row[8], 5);
  assertEquals(row[12], "昼-昼");
  assertEquals(row[13], "晴");
  assertEquals(row[14], "市街地-その他");
  assertEquals(row[16], "単路-その他");
  assertEquals(row[17], "施設なし");
  assertEquals(row[18], "車両相互");
  assertEquals(row[21], "乗用車-普通車");
  assertEquals(row[22], "軽車両-駆動補助機付自転車");
  assertEquals(row[27], "木");
});

Deno.test("parseRow - random CSV row 3: Tokyo with holiday flag", () => {
  const cols =
    "1,30,776,0117,2,000,001,10400,0000,122,2024,05,06,11,50,12,04,44,18,32,2,1,1,14,3,00,00,00,00,02,9,01,70,1,1,21,75,00,35,00,31,00,00,00,0,0,11,00,05,00,40,00,3,0,0,0,0,0,2,0,354410020,1395027254,2,1,0068,0000,1,0"
      .split(",");
  const row = parseRow(cols);
  assertEquals(row[0], "東京");
  assertEquals(row[13], "曇");
  assertEquals(row[14], "市街地-人口集中");
  assertEquals(row[17], "点滅-3灯式");
  assertEquals(row[19], 75); // party_a_age
  assertEquals(row[20], null); // party_b_age (00 → null)
  assertEquals(row[21], "二輪車-原付二種-51〜125cc");
  assertEquals(row[22], "対象外当事者");
  assertEquals(row[23], "負傷");
  assertEquals(row[24], "対象外");
  assertEquals(row[27], "月");
  assertEquals(row[28], 1); // is_holiday
});

Deno.test("parseRow - random CSV row 4: Aichi bicycle accident", () => {
  const cols =
    "1,54,263,0584,2,000,001,35000,0000,203,2024,05,18,17,17,12,04,46,18,52,1,1,1,01,7,01,21,09,22,14,9,30,70,5,2,21,35,01,03,51,31,41,01,00,1,0,11,00,10,00,10,12,3,3,2,0,2,0,4,2,351736476,1364858235,7,3,9999,0000,1,0"
      .split(",");
  const row = parseRow(cols);
  assertEquals(row[0], "愛知");
  assertEquals(row[7], 2024);
  assertEquals(row[10], 17); // hour
  assertEquals(row[16], "交差点-その他");
  assertEquals(row[19], 35); // party_a_age
  assertEquals(row[20], 1); // party_b_age
  assertEquals(row[21], "乗用車-普通車");
  assertEquals(row[22], "軽車両-自転車");
  assertEquals(row[27], "土");
});

Deno.test("parseRow - random CSV row 5: Aichi two passenger cars", () => {
  const cols =
    "1,54,131,0164,2,000,002,35520,0037,226,2024,03,21,08,40,12,05,55,18,05,1,2,1,14,7,00,00,00,00,03,9,01,70,1,2,21,75,25,03,03,31,31,01,01,1,1,11,11,03,03,11,31,3,3,2,2,2,2,4,2,351305954,1370142362,5,3,0457,9999,9,1"
      .split(",");
  const row = parseRow(cols);
  assertEquals(row[0], "愛知");
  assertEquals(row[5], 2); // injuries
  assertEquals(row[8], 3); // month
  assertEquals(row[9], 21); // day
  assertEquals(row[10], 8); // hour
  assertEquals(row[15], "舗装-乾燥");
  assertEquals(row[18], "車両相互");
  assertEquals(row[19], 75);
  assertEquals(row[20], 25);
  assertEquals(row[21], "乗用車-普通車");
  assertEquals(row[22], "乗用車-普通車");
  assertEquals(row[27], "木");
  assertEquals(row[28], 0);
});

// --- initDb / importCsv integration tests ---

const TEST_CSV =
  `資料区分,都道府県コード,警察署等コード,本票番号,事故内容,死者数,負傷者数,路線コード,地点コード,市区町村コード,発生日時　　年,発生日時　　月,発生日時　　日,発生日時　　時,発生日時　　分,昼夜,日の出時刻　　時,日の出時刻　　分,日の入り時刻　　時,日の入り時刻　　分,天候,地形,路面状態,道路形状,信号機,一時停止規制　標識（当事者A）,一時停止規制　表示（当事者A）,一時停止規制　標識（当事者B）,一時停止規制　表示（当事者B）,車道幅員,道路線形,衝突地点,ゾーン規制,中央分離帯施設等,歩車道区分,事故類型,年齢（当事者A）,年齢（当事者B）,当事者種別（当事者A）,当事者種別（当事者B）,用途別（当事者A）,用途別（当事者B）,車両形状等（当事者A）,車両形状等（当事者B）,オートマチック車（当事者A）,オートマチック車（当事者B）,サポカー（当事者A）,サポカー（当事者B）,速度規制（指定のみ）（当事者A）,速度規制（指定のみ）（当事者B）,車両の衝突部位（当事者A）,車両の衝突部位（当事者B）,車両の損壊程度（当事者A）,車両の損壊程度（当事者B）,エアバッグの装備（当事者A）,エアバッグの装備（当事者B）,サイドエアバッグの装備（当事者A）,サイドエアバッグの装備（当事者B）,人身損傷程度（当事者A）,人身損傷程度（当事者B）,地点　緯度（北緯）,地点　経度（東経）,曜日(発生年月日),祝日(発生年月日),認知機能検査経過日数（当事者A）,認知機能検査経過日数（当事者B）,運転練習の方法（当事者A）,運転練習の方法（当事者B）
1,54,102,0191,2,000,001,30000,0000,102,2024,06,21,16,10,12,04,38,19,10,1,1,1,14,7,00,00,00,00,05,9,01,70,4,2,21,75,25,04,04,31,31,01,01,1,1,11,11,10,10,10,30,3,3,2,2,2,2,4,2,351118407,1365606543,6,3,0534,9999,1,5
1,62,206,0570,2,000,001,30990,0000,203,2024,10,29,17,11,21,06,16,17,07,3,1,2,07,1,00,00,00,00,05,9,01,70,4,2,21,55,25,03,03,31,31,01,01,1,1,11,11,04,04,20,40,2,3,1,2,2,2,4,4,344845248,1352942000,3,3,9999,9999,9,5
1,44,108,0179,2,000,002,10260,0000,208,2024,06,13,16,20,12,04,23,18,56,1,3,1,14,7,00,00,00,00,03,8,01,70,4,3,21,45,65,17,04,01,31,11,01,2,1,11,11,10,10,50,50,1,1,2,1,2,2,2,2,360509205,1394653592,5,3,9999,9999,1,9
1,42,059,0118,2,000,001,42030,0306,210,2024,10,13,09,00,12,05,49,17,10,1,3,1,14,7,00,00,00,00,05,9,01,70,1,3,41,35,00,31,75,31,00,00,00,0,0,11,00,10,00,40,00,3,0,0,0,0,0,2,0,361607089,1384846673,1,2,9999,0000,1,0
1,64,105,0001,2,000,001,14380,0000,206,2024,01,09,09,14,12,07,04,17,03,1,2,1,14,7,00,00,00,00,03,9,01,70,5,4,01,65,45,14,61,31,00,11,00,2,0,11,00,02,00,30,00,4,0,2,0,2,0,4,2,343150503,1355420959,3,3,9999,0000,9,0
2,54,102,0191,2,000,001,30000,0000,102,2024,06,21,16,10,12,04,38,19,10,1,1,1,14,7,00,00,00,00,05,9,01,70,4,2,21,75,25,04,04,31,31,01,01,1,1,11,11,10,10,10,30,3,3,2,2,2,2,4,2,351118407,1365606543,6,3,0534,9999,1,5`;

Deno.test("initDb creates table and indexes", () => {
  const db = new DatabaseSync(":memory:");
  initDb(db);

  const table = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='accidents'",
  ).get() as { sql: string };
  assertEquals(table.sql.includes("prefecture TEXT"), true);
  assertEquals(table.sql.includes("latitude REAL"), true);

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='accidents' ORDER BY name",
  ).all() as { name: string }[];
  const indexNames = indexes.map((r) => r.name);
  assertEquals(indexNames.includes("idx_prefecture"), true);
  assertEquals(indexNames.includes("idx_weather"), true);
  assertEquals(indexNames.includes("idx_party_b_type"), true);
  assertEquals(indexNames.length, 10);

  db.close();
});

Deno.test("importCsv inserts rows and skips non-本票", () => {
  const db = new DatabaseSync(":memory:");
  initDb(db);

  const count = importCsv(db, TEST_CSV);
  // 5 本票 rows + 1 補充票 row (資料区分=2) → 5 inserted
  assertEquals(count, 5);

  const total = db.prepare("SELECT COUNT(*) as c FROM accidents").get() as {
    c: number;
  };
  assertEquals(total.c, 5);

  db.close();
});

Deno.test("importCsv stores correct values", () => {
  const db = new DatabaseSync(":memory:");
  initDb(db);
  importCsv(db, TEST_CSV);

  // Check first row (Aichi)
  const row = db.prepare("SELECT * FROM accidents WHERE id = 1").get() as
    & Record<string, unknown>
    & { prefecture: string; severity: string; weather: string };
  assertEquals(row.prefecture, "愛知");
  assertEquals(row.prefecture_code, "54");
  assertEquals(row.severity, "負傷");
  assertEquals(row.year, 2024);
  assertEquals(row.month, 6);
  assertEquals(row.day, 21);
  assertEquals(row.hour, 16);
  assertEquals(row.weather, "晴");
  assertEquals(row.terrain, "市街地-人口集中");
  assertEquals(row.road_shape, "単路-その他");
  assertEquals(row.traffic_signal, "施設なし");
  assertEquals(row.accident_type, "車両相互");
  assertEquals(row.party_a_type, "乗用車-軽自動車");
  assertEquals(row.party_b_type, "乗用車-軽自動車");
  assertEquals(row.day_of_week, "金");
  assertEquals(row.is_holiday, 0);

  // Check Osaka row (rain, 湿潤)
  const row2 = db.prepare("SELECT * FROM accidents WHERE id = 2").get() as
    & Record<string, unknown>
    & { prefecture: string };
  assertEquals(row2.prefecture, "大阪");
  assertEquals(row2.weather, "雨");
  assertEquals(row2.road_surface, "舗装-湿潤");
  assertEquals(row2.day_night, "夜-暮");

  // Check Gunma row (vehicle single accident)
  const row4 = db.prepare("SELECT * FROM accidents WHERE id = 4").get() as
    & Record<string, unknown>
    & { prefecture: string };
  assertEquals(row4.prefecture, "群馬");
  assertEquals(row4.accident_type, "車両単独");
  assertEquals(row4.party_b_type, "物件等");

  // Check Nara row (pedestrian)
  const row5 = db.prepare("SELECT * FROM accidents WHERE id = 5").get() as
    & Record<string, unknown>
    & { prefecture: string };
  assertEquals(row5.prefecture, "奈良");
  assertEquals(row5.month, 1);
  assertEquals(row5.party_a_type, "貨物車-軽自動車");
  assertEquals(row5.party_b_type, "歩行者");
  assertEquals(row5.accident_type, "人対車両");

  db.close();
});

Deno.test("importCsv handles latitude and longitude correctly", () => {
  const db = new DatabaseSync(":memory:");
  initDb(db);
  importCsv(db, TEST_CSV);

  const row = db.prepare(
    "SELECT latitude, longitude FROM accidents WHERE id = 1",
  ).get() as { latitude: number; longitude: number };
  // 351118407 → ~35.188, 1365606543 → ~136.935
  assertEquals(Math.abs(row.latitude - 35.188) < 0.01, true);
  assertEquals(Math.abs(row.longitude - 136.935) < 0.01, true);

  db.close();
});
