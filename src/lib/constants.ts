export const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
] as const;

/** Условия погоды, которые умеет генерировать `src/lib/weather/generator.ts`. */
export const WEATHER_CONDITIONS = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'rain',
  'snow',
  'thunderstorm',
  'fog',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];
