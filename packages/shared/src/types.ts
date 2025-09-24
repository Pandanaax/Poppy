// packages/shared/src/types.ts
export type LatLng = { lat: number; lng: number };

export type Leg = {
  from: LatLng;
  to: LatLng;

  /** Pause minutes after this leg (if not inferable from timestamps, stays manual). */
  stopMinutes?: number;

  /** Leg departure time (HTML datetime-local string / ISO-like without TZ). */
  startAt?: string;

  /** Leg arrival time (HTML datetime-local string / ISO-like without TZ). */
  endAt?: string;
};

export type Journey = { legs: Leg[] };

/** Vehicle shape from API (uuid, location lat/lng, model.tier). */
export type Vehicle = {
  id: string;
  tier: "S" | "M" | "L";
  lat: number;
  lng: number;
};

export type Pricing = {
  // Base fields
  minutePrice: number;
  kilometerPrice: number;
  pauseUnitPrice: number;
  bookUnitPrice: number;
  unlockFee: number;
  includedKilometers?: number;

  // Optional caps (apply per usage session)
  hourCapPrice?: number; // hourly cap price per started hour block
  dayCapPrice?: number;  // daily cap price per started day block
};

export type TariffChoice = "perMinute" | "perKilometer";

export type EstimateResult = {
  bestChoice: TariffChoice;
  priceMilliExclVAT: number;
  plan: Array<{
    from: LatLng;
    to: LatLng;
    stopMinutes: number;
    actionAfterLeg: "KEEP" | "END";
  }>;
  scenarios: { perMinute: number; perKilometer: number };
};
