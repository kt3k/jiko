import { assertEquals } from "@std/assert";
import { parseRow } from "./import-csv.ts";

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
