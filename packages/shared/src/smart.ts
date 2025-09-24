// packages/shared/src/smart.ts
import type { Pricing } from "./types.js";

export type SmartInput = {
  driveKm: number;   // kilometers driven
  driveMin: number;  // minutes driving
  pauseMin?: number; // minutes parked/paused (optional)
};

export type SmartOutput = {
  best: "perMinute" | "perKilometer";
  priceMilliExclVAT: number;
  priceEURInclVAT: number;
  breakdown: {
    perMinute: number;     // milli-euro excl. VAT
    perKilometer: number;  // milli-euro excl. VAT
  };
};

const VAT = 1.21;

function pricePerMinute(inp: SmartInput, p: Pricing) {
  const pause = (inp.pauseMin ?? 0) * p.pauseUnitPrice;
  const drive = inp.driveMin * p.minutePrice;
  return p.unlockFee + drive + pause;
}

function pricePerKilometer(inp: SmartInput, p: Pricing) {
  const pause = (inp.pauseMin ?? 0) * p.pauseUnitPrice;
  const extraKm = Math.max(0, inp.driveKm - (p.includedKilometers ?? 0));
  const drive = extraKm * p.kilometerPrice;
  return p.unlockFee + drive + pause;
}

export function smartBest(
  inp: SmartInput,
  perMinute: Pricing,
  perKilometer: Pricing
): SmartOutput {
  const a = Math.round(pricePerMinute(inp, perMinute));
  const b = Math.round(pricePerKilometer(inp, perKilometer));
  const best = a <= b ? "perMinute" : "perKilometer";
  const priceMilliExclVAT = Math.min(a, b);
  const priceEURInclVAT = (priceMilliExclVAT / 1000) * VAT;
  return {
    best,
    priceMilliExclVAT,
    priceEURInclVAT,
    breakdown: { perMinute: a, perKilometer: b },
  };
}
