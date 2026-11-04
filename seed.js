const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Force delete existing database to start fresh
const dbPath = path.join(process.cwd(), 'dev.db');
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (e) {
    console.log('Warning: Could not delete old dev.db:', e.message);
  }
}

const sqlite = new Database(dbPath);

// Create tables if not exist
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

// Read mock data for base info
const mockPath = process.cwd() + '/mocks/weatherMock.json';
const content = fs.readFileSync(mockPath, { encoding: 'utf-8' });
const data = JSON.parse(content);

// Clear existing data
sqlite.exec('DELETE FROM daily_weather');
sqlite.exec('DELETE FROM cities');

// Seed cities
const insertCity = sqlite.prepare('INSERT INTO cities (name) VALUES (@name)');
for (const city of data.cities) {
  insertCity.run({ name: city.name });
}

// Generate realistic weekly weather for each city
const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const insertDaily = sqlite.prepare(
  'INSERT INTO daily_weather (city_id, day_of_week, max_temp_c, min_temp_c, precipitation_mm, pressure_hpa) VALUES (@cityId, @dayOfWeek, @maxTempC, @minTempC, @precipitationMm, @pressureHpa)',
);

// Get city IDs
const getCities = sqlite.prepare('SELECT id, name FROM cities').all();
for (const city of data.cities) {
  const cityRow = getCities.find((c) => c.name === city.name);
  if (!cityRow) continue;

  const cityId = cityRow.id;
  // Generate varied weather for each day with some randomness based on base values
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    // Temperature variation: ±3°C from base, slight upward trend mid-week
    const tempVariation = Math.round(Math.sin(dayIdx * 0.8) * 2 + (dayIdx > 3 ? -1 : 0));
    const maxTemp = city.maxTempC + tempVariation;
    const minTemp = city.minTempC + Math.round(tempVariation * 0.7);

    // Precipitation: varied, some days dry, others rainy (based on city's base precipitation)
    let precipMM = null;
    if (city.precipitationMm > 5) {
      // Rainy city: more frequent precipitation
      precipMM =
        dayIdx % 3 === 0
          ? Math.round(city.precipitationMm * (0.6 + Math.random() * 0.8))
          : Math.round(Math.random() * 3);
    } else {
      // Dry city: occasional light rain
      precipMM = Math.random() < 0.2 ? Math.round(2 + Math.random() * 5) : 0;
    }

    // Pressure: slight variation around base, typical range ±10 hPa
    const pressure = city.pressureHpa + Math.round(Math.sin(dayIdx * 1.2) * 8);

    insertDaily.run({
      cityId,
      dayOfWeek: dayIdx,
      maxTempC: maxTemp,
      minTempC: minTemp,
      precipitationMm: precipMM,
      pressureHpa: pressure,
    });
  }
}

// Verify data
const citiesCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM cities').get().cnt;
const dailyCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM daily_weather').get().cnt;
console.log(`Seeded ${citiesCount} cities with ${dailyCount} daily weather records`);

const report = sqlite
  .prepare(
    `SELECT c.name, dw.day_of_week, dw.max_temp_c, dw.min_temp_c, dw.precipitation_mm, dw.pressure_hpa
   FROM cities c
   LEFT JOIN daily_weather dw ON c.id = dw.city_id
   ORDER BY c.name, dw.day_of_week`,
  )
  .all();

console.log('\nWeekly weather data:');
let currentCity = '';
for (const row of report) {
  if (row.name !== currentCity) {
    currentCity = row.name;
    console.log(`\n${currentCity}:`);
  }
  const dayName = days[row.day_of_week];
  console.log(
    `  ${dayName.padEnd(12)}: ${row.max_temp_c}°C / ${row.min_temp_c}°C, ` +
      `${row.precipitation_mm ?? '—'}mm, ${row.pressure_hpa} hPa`,
  );
}

sqlite.close();
