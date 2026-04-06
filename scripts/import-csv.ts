import { DatabaseSync } from "node:sqlite";

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

if (import.meta.main) {
  const db = new DatabaseSync(DB_PATH);
  db.exec(CREATE_TABLE);
  for (const sql of CREATE_INDEXES) {
    db.exec(sql);
  }
  console.log("Table and indexes created.");
  db.close();
}

export { CREATE_INDEXES, CREATE_TABLE, DB_PATH };
