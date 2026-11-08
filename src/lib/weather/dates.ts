const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Календарная дата в таймзоне города: `en-CA` даёт сразу `YYYY-MM-DD`. */
export const isoDateInZone = (timezone: string, at: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(at);

/** Дата разбирается как UTC-полночь, чтобы арифметика не зависела от таймзоны процесса. */
const toTimestamp = (isoDate: string): number => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const toIsoDate = (timestamp: number): string => new Date(timestamp).toISOString().slice(0, 10);

export const isIsoDate = (value: string): boolean =>
  ISO_DATE_PATTERN.test(value) && toIsoDate(toTimestamp(value)) === value;

/** Понедельник календарной недели, в которую попадает дата. */
export const weekStartFor = (isoDate: string): string => {
  const timestamp = toTimestamp(isoDate);
  const offsetFromMonday = (new Date(timestamp).getUTCDay() + 6) % 7;
  return toIsoDate(timestamp - offsetFromMonday * DAY_MS);
};

/** Семь дат недели Пн→Вс — порядок ожидает и UI, и контракт API. */
export const weekDates = (isoDate: string): string[] => {
  const weekStart = toTimestamp(weekStartFor(isoDate));
  return Array.from({ length: 7 }, (_, index) => toIsoDate(weekStart + index * DAY_MS));
};
