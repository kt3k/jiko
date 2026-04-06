import { DatabaseSync } from "node:sqlite";
import {
  ACCIDENT_TYPE_MAP,
  convertCoordinate,
  DAY_NIGHT_MAP,
  DAY_OF_WEEK_MAP,
  INJURY_MAP,
  PARTY_TYPE_MAP,
  PREFECTURE_MAP,
  ROAD_SHAPE_MAP,
  ROAD_SURFACE_MAP,
  SEVERITY_MAP,
  TERRAIN_MAP,
  WEATHER_MAP,
} from "../lib/codemap.ts";

const DB_PATH = Deno.env.get("SQLITE_PATH") ?? "./accidents.db";

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS accidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prefecture TEXT,
  prefecture_code TEXT,
  police_station TEXT,
  severity TEXT,
  fatalities INTEGER,
  injuries INTEGER,
  municipality_code TEXT,
  year INTEGER,
  month INTEGER,
  day INTEGER,
  hour INTEGER,
  minute INTEGER,
  day_night TEXT,
  weather TEXT,
  terrain TEXT,
  road_surface TEXT,
  road_shape TEXT,
  traffic_signal TEXT,
  accident_type TEXT,
  party_a_age INTEGER,
  party_b_age INTEGER,
  party_a_type TEXT,
  party_b_type TEXT,
  party_a_injury TEXT,
  party_b_injury TEXT,
  latitude REAL,
  longitude REAL,
  day_of_week TEXT,
  is_holiday BOOLEAN
)`;

const CREATE_INDEXES = [
  "CREATE INDEX IF NOT EXISTS idx_prefecture ON accidents(prefecture)",
  "CREATE INDEX IF NOT EXISTS idx_month ON accidents(month)",
  "CREATE INDEX IF NOT EXISTS idx_hour ON accidents(hour)",
  "CREATE INDEX IF NOT EXISTS idx_weather ON accidents(weather)",
  "CREATE INDEX IF NOT EXISTS idx_accident_type ON accidents(accident_type)",
  "CREATE INDEX IF NOT EXISTS idx_severity ON accidents(severity)",
  "CREATE INDEX IF NOT EXISTS idx_day_of_week ON accidents(day_of_week)",
  "CREATE INDEX IF NOT EXISTS idx_road_shape ON accidents(road_shape)",
  "CREATE INDEX IF NOT EXISTS idx_party_a_type ON accidents(party_a_type)",
  "CREATE INDEX IF NOT EXISTS idx_party_b_type ON accidents(party_b_type)",
];

const SIGNAL_MAP: Record<string, string> = {
  "1": "点灯-3灯式",
  "8": "点灯-歩車分式",
  "2": "点灯-押ボタン式",
  "3": "点滅-3灯式",
  "4": "点滅-1灯式",
  "5": "消灯",
  "6": "故障",
  "7": "施設なし",
};

/** CSV の1行（カラム配列）を accidents テーブルの値配列に変換する */
export function parseRow(cols: string[]) {
  const prefCode = cols[1];
  const lat = cols[60];
  const lon = cols[61];
  return [
    PREFECTURE_MAP[prefCode] ?? prefCode, // prefecture
    prefCode, // prefecture_code
    cols[2], // police_station
    SEVERITY_MAP[cols[4]] ?? cols[4], // severity
    parseInt(cols[5]) || 0, // fatalities
    parseInt(cols[6]) || 0, // injuries
    cols[9], // municipality_code
    parseInt(cols[10]) || 0, // year
    parseInt(cols[11]) || 0, // month
    parseInt(cols[12]) || 0, // day
    parseInt(cols[13]) || 0, // hour
    parseInt(cols[14]) || 0, // minute
    DAY_NIGHT_MAP[cols[15]] ?? cols[15], // day_night
    WEATHER_MAP[cols[20]] ?? cols[20], // weather
    TERRAIN_MAP[cols[21]] ?? cols[21], // terrain
    ROAD_SURFACE_MAP[cols[22]] ?? cols[22], // road_surface
    ROAD_SHAPE_MAP[cols[23]] ?? cols[23], // road_shape
    SIGNAL_MAP[cols[24]] ?? cols[24], // traffic_signal
    ACCIDENT_TYPE_MAP[cols[35]] ?? cols[35], // accident_type
    parseInt(cols[36]) || null, // party_a_age
    parseInt(cols[37]) || null, // party_b_age
    PARTY_TYPE_MAP[cols[38]] ?? cols[38], // party_a_type
    PARTY_TYPE_MAP[cols[39]] ?? cols[39], // party_b_type
    INJURY_MAP[cols[58]] ?? cols[58], // party_a_injury
    INJURY_MAP[cols[59]] ?? cols[59], // party_b_injury
    lat ? convertCoordinate(lat) : null, // latitude
    lon ? convertCoordinate(lon) : null, // longitude
    DAY_OF_WEEK_MAP[cols[62]] ?? cols[62], // day_of_week
    cols[63] === "1" ? 1 : 0, // is_holiday
  ];
}

const INSERT_SQL = `INSERT INTO accidents (
  prefecture, prefecture_code, police_station, severity,
  fatalities, injuries, municipality_code,
  year, month, day, hour, minute,
  day_night, weather, terrain, road_surface,
  road_shape, traffic_signal, accident_type,
  party_a_age, party_b_age, party_a_type, party_b_type,
  party_a_injury, party_b_injury,
  latitude, longitude, day_of_week, is_holiday
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const BATCH_SIZE = 1000;
const CSV_PATH = Deno.env.get("CSV_PATH") ?? "./honhyo_2024.csv";

if (import.meta.main) {
  const db = new DatabaseSync(DB_PATH);
  db.exec(CREATE_TABLE);
  for (const sql of CREATE_INDEXES) {
    db.exec(sql);
  }
  console.log("Table and indexes created.");

  const text = Deno.readTextFileSync(CSV_PATH);
  const lines = text.split("\n");
  const stmt = db.prepare(INSERT_SQL);
  let count = 0;

  db.exec("BEGIN TRANSACTION");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    // 資料区分=1 (本票) のみインポート
    if (cols[0] !== "1") continue;
    const values = parseRow(cols);
    stmt.run(...values);
    count++;
    if (count % BATCH_SIZE === 0) {
      db.exec("COMMIT");
      db.exec("BEGIN TRANSACTION");
      console.log(`${count} rows inserted...`);
    }
  }
  db.exec("COMMIT");

  console.log(`Done. Total ${count} rows inserted.`);
  db.close();
}

export { CREATE_INDEXES, CREATE_TABLE, DB_PATH };
