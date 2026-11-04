export interface WeatherDay {
  day: string;
  maxTempC?: number | null;
  minTempC?: number | null;
  precipitationMm?: number | null;
  pressureHpa?: number | null;
}
