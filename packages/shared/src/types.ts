/** Basic latitude/longitude pair */
export type LatLng = { lat: number; lng: number };

/** One leg of a journey (drive from->to, then optional pause) */
export type Leg = {
  from: LatLng;
  to: LatLng;

  /** Pause minutes after this leg (if not inferable from timestamps, stays manual). */
  stopMinutes?: number;

  /** Leg departure time (HTML datetime-local / ISO-like without TZ). */
  startAt?: string;

  /** Leg arrival time (HTML datetime-local / ISO-like without TZ). */
  endAt?: string;
};

/** A journey is an ordered list of legs */
export type Journey = { legs: Leg[] };

/** Vehicle tier (pricing families). XL kept for robustness even if not always used */
export type Tier = "S" | "M" | "L" | "XL";

/** Vehicle shape (loosely aligned with Poppy Partner & v3 APIs) */
export type Vehicle = {
  id: string;

  // Position (required)
  lat: number;
  lng: number;

  // Catalog/pricing hints (optional in payloads, so keep them optional here)
  tier?: Tier | string;                 // often "S" | "M" | "L"
  modelType?: "car" | "van" | string;   // API pricing accepts only car|van
  category?: string;                    // sometimes "car" appears here

  // Extras (not always present)
  fuel?: number;
  status?: string;
};

/** Pricing (values in thousandths, VAT excluded) */
export type Pricing = {
  // Base
  minutePrice: number;        // per-minute move price (thousandths)
  kilometerPrice: number;     // per-km price (thousandths, after includedKilometers)
  pauseUnitPrice: number;     // per-minute pause price (thousandths)
  bookUnitPrice: number;      // per-minute booking price after 15 min free (thousandths)
  unlockFee: number;          // one-time unlock fee (thousandths)
  includedKilometers?: number;

  // Optional caps (apply per usage session)
  hourCapPrice?: number;      // cap per started hour block (thousandths)
  dayCapPrice?: number;       // cap per started day block (thousandths)

  // Optional additional fees (e.g., airports). API shape may vary:
  // sometimes it's { fees: [{name, amount}, ...] }, sometimes it's a flat array.
  additionalFees?: unknown;
};

/** Tariff choice for a whole session (no switching mid-leg) */
export type TariffChoice = "perMinute" | "perKilometer";

/** Result of the cost estimation engine */
export type EstimateResult = {
  bestChoice: TariffChoice;
  /** Total price in thousandths, VAT excluded */
  priceMilliExclVAT: number;

  /** Plan mirror with a simple action hint (UI can refine KEEP/END if needed) */
  plan: Array<{
    from: LatLng;
    to: LatLng;
    stopMinutes: number;
    actionAfterLeg: "KEEP" | "END";
  }>;

  /** Raw scenarios to show both bases (thousandths, excl. VAT) */
  scenarios: { perMinute: number; perKilometer: number };
};

/** Minimal GeoZones structure used by the planner (parking / no-parking polygons) */
export type GeoZones = {
  features: Array<{
    properties: { type?: string; name?: string; mode?: string };
    geometry: { type: string; coordinates: any };
  }>;
};