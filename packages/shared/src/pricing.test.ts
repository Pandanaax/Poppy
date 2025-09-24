import { describe, it, expect } from "vitest";
import { estimateJourney } from "./pricing";
import type { Vehicle, Pricing } from "./types";
import type { RouteProvider } from "./routes";

function rpConst(driveMin: number, walkMin: number): RouteProvider {
  return {
    driveMinutes: async () => driveMin,
    walkMinutes: async () => walkMin,
  };
}

const perMinute: Pricing = {
  minutePrice: 100,     // 0.10 €/min (milli-eur)
  kilometerPrice: 0,    // ignored for perMinute
  pauseUnitPrice: 10,
  bookUnitPrice: 5,
  unlockFee: 200,
  includedKilometers: 0,
  hourCapPrice: 0,
  dayCapPrice: 0,
};

const perKilometerExpensive: Pricing = {
  minutePrice: 0,
  kilometerPrice: 10000, // 10 €/km (expensive so perMinute wins)
  pauseUnitPrice: 10,
  bookUnitPrice: 5,
  unlockFee: 200,
  includedKilometers: 0,
  hourCapPrice: 0,
  dayCapPrice: 0,
};

describe("pricing.estimateJourney", () => {
  it("computes scenarios and picks the cheapest (perMinute here)", async () => {
    const vehicles: Vehicle[] = [
      { id: "v1", tier: "M", lat: 50, lng: 4 },
      { id: "v2", tier: "M", lat: 50.5, lng: 4.5 },
    ];

    const pricingByTier = {
      M: { perMinute, perKilometer: perKilometerExpensive },
      S: { perMinute, perKilometer: perKilometerExpensive },
      L: { perMinute, perKilometer: perKilometerExpensive },
    } as any;

    const inParking = () => true; // allow closing session
    const routeProvider = rpConst(20, 10); // 20 min drive, 10 min walk

    const legs = [
      { from: { lat: 50, lng: 4 }, to: { lat: 50.1, lng: 4.1 }, stopMinutes: 5 },
    ];

    const res = await estimateJourney(
      { legs },
      { vehicles, pricingByTier, inParking, routeProvider }
    );

    // Per-minute math (no caps):
    // reservation = unlock (200) + booking (max(0, 10-15)*5 = 0) = 200
    // drive       = 100 * 20 = 2000
    // pause       = 10 * 5   = 50
    // total       = 2250 (milli-eur)
    expect(res.scenarios.perMinute).toBe(2250);

    // Per-km is very expensive (>= 10€/km), so > 2250
    expect(res.scenarios.perKilometer).toBeGreaterThan(2250);
    expect(res.bestChoice).toBe("perMinute");

    // Plan is mirrored through
    expect(res.plan[0]).toMatchObject({
      from: legs[0].from,
      to: legs[0].to,
      stopMinutes: 5,
      actionAfterLeg: "KEEP",
    });
  });

  it("applies caps when provided (hourCap)", async () => {
    const cappedPM: Pricing = { ...perMinute, hourCapPrice: 1000 }; // cap < raw 2250

    const pricingByTier = {
      M: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
      S: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
      L: { perMinute: cappedPM, perKilometer: perKilometerExpensive },
    } as any;

    const vehicles: Vehicle[] = [{ id: "v1", tier: "M", lat: 0, lng: 0 }];
    const inParking = () => true;
    const routeProvider = rpConst(20, 10);
    const legs = [{ from: { lat: 0, lng: 0 }, to: { lat: 0.1, lng: 0.1 }, stopMinutes: 5 }];

    const res = await estimateJourney(
      { legs },
      { vehicles, pricingByTier, inParking, routeProvider }
    );

    // Raw 2250 would be capped to 1000 for a <=60 min session
    expect(res.scenarios.perMinute).toBe(1000);
    expect(res.bestChoice).toBe("perMinute");
  });

  it("uses nearest vehicle by Haversine (indirectly via cheaper tier pricing)", async () => {
    // Put a cheap tier S at the leg start and a pricey tier L far away;
    // if nearest selection works, it will pick S's pricing.
    const cheapPM: Pricing = { ...perMinute, minutePrice: 50 };     // cheaper (0.05€/min)
    const priceyPM: Pricing = { ...perMinute, minutePrice: 500 };   // more expensive

    const vehicles: Vehicle[] = [
      { id: "near-S", tier: "S", lat: 10, lng: 10 },   // nearest
      { id: "far-L",  tier: "L", lat: 20, lng: 20 },   // far
    ];

    const pricingByTier = {
      S: { perMinute: cheapPM, perKilometer: perKilometerExpensive },
      L: { perMinute: priceyPM, perKilometer: perKilometerExpensive },
      M: { perMinute, perKilometer: perKilometerExpensive },
    } as any;

    const inParking = () => true;
    const routeProvider = rpConst(10, 5); // arbitrary
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
