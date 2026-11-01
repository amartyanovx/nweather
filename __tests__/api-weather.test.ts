/** Jest unit tests for the Next.js API route `/api/weather`. */

// Import the handler from the route implementation using ES‑modules syntax.
import { GET } from "../app/api/weather/route";
// Import the type for the mock data structure.
interface WeatherCity {
  name: string;
  maxTempC?: number;
  minTempC?: number;
  precipitationMm?: number;
  pressureHpa?: number;
}

// Mock the file system read operation used inside the handler.
jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));

import fs from "node:fs/promises";

// Sample mock data that mirrors the structure of `mocks/weatherMock.json`.
const mockData: { cities: WeatherCity[] } = {
  cities: [
    { name: "CityA", maxTempC: 20, minTempC: 10 },
    { name: "CityB", maxTempC: 25, minTempC: 12 },
  ],
};

beforeEach(() => {
  const mockRead = fs.readFile as unknown as jest.MockedFunction<typeof fs.readFile>;
  mockRead.mockResolvedValue(JSON.stringify(mockData));
});

afterAll(() => {
  jest.resetAllMocks();
});

describe("GET /api/weather", () => {
  it("returns list of city names when no query param", async () => {
    const req = new Request("http://localhost/api/weather");
    const res = await GET(req);
    const json = await res.json();
    expect(json).toEqual({ cities: ["CityA", "CityB"] });
  });

  it("returns data for a valid city", async () => {
    const req = new Request("http://localhost/api/weather?city=CityA");
    const res = await GET(req);
    const json = await res.json();
    expect(json.name).toBe("CityA");
    expect(json.maxTempC).toBe(20);
  });

  it("returns 404 for an unknown city", async () => {
    const req = new Request("http://localhost/api/weather?city=Unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
