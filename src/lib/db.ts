import Database from 'better-sqlite3';
import path from 'node:path';

const sqlite = new Database(path.join(process.cwd(), 'dev.db'));

// Create tables if not exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS daily_weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER REFERENCES cities(id),
    day_of_week INTEGER NOT NULL,
    max_temp_c REAL,
    min_temp_c REAL,
    precipitation_mm REAL,
    pressure_hpa REAL
  )
`);

import { drizzle } from 'drizzle-orm/better-sqlite3';
export const db = drizzle(sqlite);
