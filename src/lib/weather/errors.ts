import { NextResponse } from 'next/server';

export type WeatherErrorCode = 'INVALID_QUERY' | 'CITY_NOT_FOUND' | 'INTERNAL';

const STATUS_BY_CODE: Record<WeatherErrorCode, number> = {
  INVALID_QUERY: 400,
  CITY_NOT_FOUND: 404,
  INTERNAL: 500,
};

/** Ожидаемая ошибка API: код для клиента, HTTP-статус выводится из кода. */
export class WeatherError extends Error {
  readonly code: WeatherErrorCode;

  constructor(code: WeatherErrorCode, message: string) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

/**
 * Единая форма тела ошибки — `{ error: { code, message } }`. Непредвиденные ошибки (БД, генератор)
 * логируются целиком и отдаются как `INTERNAL`, чтобы наружу не уходили внутренние сообщения.
 */
export const errorResponse = (error: unknown): NextResponse => {
  if (error instanceof WeatherError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error('Unexpected error in weather API', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' } },
    { status: STATUS_BY_CODE.INTERNAL },
  );
};
