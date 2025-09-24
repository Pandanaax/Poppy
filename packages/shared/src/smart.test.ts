import { describe, it, expect } from "vitest";
import { smartBest } from "./smart";
import type { Pricing } from "./types";

// Helper to build minimal Pricing quickly
const P = (over: Partial<Pricing> = {}): Pricing => ({
  minutePrice: 0,
  kilometerPrice: 0,
  pauseUnitPrice: 0,
  bookUnitPrice: 0,   // not used by smartBest
  unlockFee: 0,
  includedKilometers: 0,
  ...over,
});

describe("smart.smartBest", () => {
  it("ties go to perMinute (a <= b)", () => {
    // Both end up 1230 milli-eur excl. VAT
    const perMinute = P({ minutePrice: 100, pauseUnitPrice: 10, unlockFee: 200 });
    const perKm     = P({ kilometerPrice: 200, pauseUnitPrice: 10, unlockFee: 200 });

    const out = smartBest(
      { driveKm: 5, driveMin: 10, pauseMin: 3 },
      perMinute,
      perKm
    );

    expect(out.best).toBe("perMinute");
    expect(out.breakdown.perMinute).toBe(200 + 100 * 10 + 10 * 3); // 1230
    expect(out.breakdown.perKilometer).toBe(200 + 200 * 5 + 10 * 3); // 1230
    expect(out.priceMilliExclVAT).toBe(1230);
    // 1.230 € * 1.21 = 1.4883
    expect(out.priceEURInclVAT).toBeCloseTo(1.4883, 6);
  });

  it("chooses perKilometer when kilometer pricing is cheaper", () => {
    const perMinute = P({ minutePrice: 500, pauseUnitPrice: 10, unlockFee: 200 });   // 0.50 €/min
    const perKm     = P({ kilometerPrice: 100, pauseUnitPrice: 10, unlockFee: 200 }); // 0.10 €/km

    const out = smartBest(
      { driveKm: 5, driveMin: 10, pauseMin: 2 },
      perMinute,
      perKm
    );

    const a = 200 + 500 * 10 + 10 * 2; // 200 + 5000 + 20 = 5220
    const b = 200 + 100 * 5 + 10 * 2;  // 200 + 500  + 20 = 720

    expect(out.breakdown.perMinute).toBe(a);
    expect(out.breakdown.perKilometer).toBe(b);
    expect(out.best).toBe("perKilometer");
    expect(out.priceMilliExclVAT).toBe(720);
    expect(out.priceEURInclVAT).toBeCloseTo((0.72) * 1.21, 6);
  });

  it("respects includedKilometers (no extra charge under allowance)", () => {
    const perKm = P({ kilometerPrice: 300, includedKilometers: 10, unlockFee: 100 });
    const perMin = P({ minutePrice: 50, unlockFee: 100 }); // set something non-zero

    const out = smartBest(
      { driveKm: 8, driveMin: 15, pauseMin: 0 },
      perMin,
      perKm
    );

    const kmCost = 100 + 0;                 // under 10 km -> no per-km drive cost
    const minCost = 100 + 50 * 15;          // 100 + 750 = 850

    expect(out.breakdown.perKilometer).toBe(kmCost);
    expect(out.breakdown.perMinute).toBe(minCost);
    expect(out.best).toBe("perKilometer");
    expect(out.priceMilliExclVAT).toBe(kmCost);
    expect(out.priceEURInclVAT).toBeCloseTo((kmCost / 1000) * 1.21, 6);
  });
});
