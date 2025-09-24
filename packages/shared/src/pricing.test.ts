import { describe, it, expect } from "vitest";
import { estimateJourney } from "./pricing.js";
import type { Vehicle, Pricing } from "./types.js";
import type { RouteProvider } from "./routes.js";

/** Simple constant route provider (no HTTP), returns fixed minutes */
function rpConst(driveMin: number, walkMin: number): RouteProvider {
  return {
    driveMinutes: async () => driveMin,
    walkMinutes: async () => walkMin,
  };
}

/** Per-minute baseline pricing (values in thousandths, excl. VAT) */
const perMinute: Pricing = {
  minutePrice: 100,       // 0.10 €/min
  kilometerPrice: 0,      // ignored in per-minute scenario
  pauseUnitPrice: 10,
  bookUnitPrice: 5,
  unlockFee: 200,
  includedKilometers: 0,
};

/** Per-km deliberately expensive so per-minute wins */
const perKilometerExpensive: Pricing = {
  minutePrice: 0,
  kilometerPrice: 10000,  // 10 €/km
  pauseUnitPrice: 10,
  bookUnitPrice: 5,
  unlockFee: 200,
  includedKilometers: 0,
};

describe("pricing.estimateJourney", () => {
  it("computes scenarios and picks the cheapest (per-minute here)", async () => {
    const vehicles: Vehicle[] = [
      { id: "v1", tier: "M", lat: 50, lng: 4, modelType: "car", category: "car" },
      { id: "v2", tier: "M", lat: 50.5, lng: 4.5, modelType: "car", category: "car" },
    ];

    // Pricing catalog by tier (minimalistic)
    const pricingByTier = {
      M: { perMinute, perKilometer: perKilometerExpensive },
      S: { perMinute, perKilometer: perKilometerExpensive },
      L: { perMinute, perKilometer: perKilometerExpensive },
    } as any;

    const inParking = () => true;            // allow ending the leg
    const routeProvider = rpConst(20, 10);   // 20 min drive, 10 min walk

    const legs = [
      { from: { lat: 50, lng: 4 }, to: { lat: 50.1, lng: 4.1 }, stopMinutes: 5 },
    ];

    const res = await estimateJourney(
      { legs },
      { vehicles, pricingByTier, inParking, routeProvider }
    );

    // Per-minute math (excl. VAT, thousandths):
    // unlock     = 200
    // booking    = max(0, 10-15) * 5 = 0
    // drive      = 100 * 20 = 2000
    // pause      = 10 * 5   = 50
    // total PM   = 2250
    expect(res.scenarios.perMinute).toBe(2250);

    // Per-km is intentionally expensive
    expect(res.scenarios.perKilometer).toBeGreaterThan(2250);
    expect(res.bestChoice).toBe("perMinute");

    // Plan mirrors the input leg and recommends not to pause (KEEP/END decided inside engine)
    expect(res.plan[0]).toMatchObject({
      from: legs[0].from,
      to: legs[0].to,
      stopMinutes: 5,
    });
  });

  it("applies caps when provided (hourCap)", async () => {
    // If your engine/types support caps, keep this.
    // Otherwise, you can skip this test.
    const cappedPM: Pricing = {
      ...perMinute,
      // @ts-expect-error optional in some type defs
      hourCapPrice: 1000,  // cap below the raw 2250
    } as any;

    const pricingByTier = {
      M: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
      S: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
      L: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
    } as any;

    const vehicles: Vehicle[] = [
      { id: "v1", tier: "M", lat: 0, lng: 0, modelType: "car", category: "car" },
    ];

    const inParking = () => true;
    const routeProvider = rpConst(20, 10);
    const legs = [{ from: { lat: 0, lng: 0 }, to: { lat: 0.1, lng: 0.1 }, stopMinutes: 5 }];

    const res = await estimateJourney(
      { legs },
      { vehicles, pricingByTier, inParking, routeProvider }
    );

    // Raw 2250 would be capped to 1000 for a <= 60 min session
    expect(res.scenarios.perMinute).toBe(1000);
    expect(res.bestChoice).toBe("perMinute");
  });

  it("uses nearest vehicle by Haversine (implicitly via cheaper tier pricing)", async () => {
    const cheapPM: Pricing = { ...perMinute, minutePrice: 50 };    // 0.05€/min
    const priceyPM: Pricing = { ...perMinute, minutePrice: 500 };  // 0.50€/min

    const vehicles: Vehicle[] = [
      { id: "near-S", tier: "S", lat: 10, lng: 10, modelType: "car", category: "car" }, // nearest
      { id: "far-L",  tier: "L", lat: 20, lng: 20, modelType: "car", category: "car" }, // far
    ];

    const pricingByTier = {
      S: { perMinute: cheapPM, perKilometer: perKilometerExpensive },
      L: { perMinute: priceyPM, perKilometer: perKilometerExpensive },
      M: { perMinute, perKilometer: perKilometerExpensive },
    } as any;

    const inParking = () => true;
    const routeProvider = rpConst(10, 5);
    const legs = [{ from: { lat: 10, lng: 10 }, to: { lat: 10.1, lng: 10.1 }, stopMinutes: 0 }];

    const res = await estimateJourney(
      { legs },
      { vehicles, pricingByTier, inParking, routeProvider }
    );

    // With S chosen (minutePrice 50, 10 min drive, 0 pause, unlock 200, booking 0):
    // total = 200 + (50*10) = 700
    expect(res.scenarios.perMinute).toBe(700);
    expect(res.bestChoice).toBe("perMinute");
  });
});
