import Database from 'better-sqlite3';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database(path.join(process.cwd(), 'dev.db'));

/** Соединение без DDL и автосида: схема создаётся только миграциями (`npm run db:migrate`). */
export const db = drizzle(sqlite);
