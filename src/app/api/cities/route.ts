import { connection, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/weather/errors';
import { listCities } from '@/lib/weather/service';

/**
 * `connection()` обязателен: `better-sqlite3` синхронный, и без него запрос выполнился бы
 * во время пререндера на `next build`, а список городов закэшировался бы вместе со сборкой.
 * Вызов стоит вне `try`: прерывание пререндера — сигнал Next.js, а не ошибка API.
 */
export async function GET() {
  await connection();

  try {
    return NextResponse.json({ cities: await listCities() });
  } catch (error) {
    return errorResponse(error);
  }
}
