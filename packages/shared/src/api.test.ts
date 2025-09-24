import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchVehicles, fetchParkingTester, fetchPricingForTier, VEHICLES_URL, GEOZONES_URL, PRICING_URL } from "./api";

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api.fetchVehicles", () => {
  it("maps vehicles array response and filters to cars only (model.type)", async () => {
    const payload = [
      {
        uuid: "v1",
        model: { type: "car", tier: "M" },
        locationLatitude: 50,
        locationLongitude: 4,
      },
      {
        uuid: "v2",
        model: { type: "van", tier: "M" }, // filtered out
        locationLatitude: 50.01,
        locationLongitude: 4.01,
      },
      {
        uuid: "v3",
        modelType: "car", // alternate field
        tier: "S",        // some APIs put tier here
        locationLatitude: null, // invalid -> filtered out by coords check
        locationLongitude: 4.1,
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const list = await fetchVehicles();
    expect(fetchMock).toHaveBeenCalledWith(
      VEHICLES_URL,
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) })
    );
    expect(list).toEqual([
      { id: "v1", tier: "M", lat: 50, lng: 4 },
    ]);
  });

  it("supports { vehicles: [...] } response shape", async () => {
    const payload = {
      vehicles: [
        {
          uuid: "v10",
          model: { type: "car", tier: "L" },
          locationLatitude: 51,
          locationLongitude: 4.2,
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const list = await fetchVehicles();
    expect(list).toEqual([{ id: "v10", tier: "L", lat: 51, lng: 4.2 }]);
  });

  it("throws on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    await expect(fetchVehicles()).rejects.toThrow(/vehicles 500/i);
  });
});

describe("api.fetchParkingTester", () => {
  it("returns a tester function from Polygon and respects inside/outside", async () => {
    // Square around (0,0) to (1,1) — note [lng, lat]
    const ring = [
      [0, 0], [1, 0], [1, 1], [0, 1], [0, 0],
    ];
    const payload = {
      features: [
        {
          geofencingType: "parking",
          geom: { geometry: { type: "Polygon", coordinates: [ring] } },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const tester = await fetchParkingTester();
    expect(fetchMock).toHaveBeenCalledWith(
      GEOZONES_URL,
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) })
    );

    expect(tester(0.5, 0.5)).toBe(true);  // inside
    expect(tester(2, 2)).toBe(false);     // outside
  });

  it("supports MultiPolygon and returns true if in any polygon", async () => {
    const squareA = [[[0,0],[1,0],[1,1],[0,1],[0,0]]];       // (0..1,0..1)
    const squareB = [[[10,10],[11,10],[11,11],[10,11],[10,10]]]; // (10..11,10..11)
    const payload = {
      features: [
        {
          properties: { type: "parking" }, // alternate shape
          geometry: { type: "MultiPolygon", coordinates: [squareA, squareB] },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const tester = await fetchParkingTester();
    expect(tester(0.5, 0.5)).toBe(true);
    expect(tester(10.5, 10.5)).toBe(true);
    expect(tester(5, 5)).toBe(false);
  });

  it("dev-fallback: returns 'allow all' tester on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => "oops" });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const tester = await fetchParkingTester();
    // Should not throw; should allow any coordinate
    expect(tester(999, 999)).toBe(true);
  });
});

describe("api.fetchPricingForTier", () => {
  it("maps pricing fields and additional fees", async () => {
    const payload = {
      pricingPerMinute: { minutePrice: 100, pauseUnitPrice: 10, bookUnitPrice: 5, unlockFee: 200 },
      pricingPerKilometer: { kilometerPrice: 300, pauseUnitPrice: 10, bookUnitPrice: 5, unlockFee: 200, includedKilometers: 10 },
      smartPricing: { minutePrice: 80 },
      additionalFees: { fees: [{ name: "Airport", amount: 2000 }] },
    };

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const out = await fetchPricingForTier("M");
    expect(fetchMock).toHaveBeenCalledWith(
      PRICING_URL("M"),
      expect.objectContaining({ headers: expect.objectContaining({ accept: "application/json" }) })
    );
    expect(out.perMinute).toEqual(payload.pricingPerMinute);
    expect(out.perKilometer).toEqual(payload.pricingPerKilometer);
    expect(out.smart).toEqual(payload.smartPricing);
    expect(out.additionalFees).toEqual([{ name: "Airport", amount: 2000 }]);
  });

  it("throws on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    await expect(fetchPricingForTier("S")).rejects.toThrow(/pricing S 404/i);
  });
});
