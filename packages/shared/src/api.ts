import { Vehicle, Pricing } from "./types.js";
import { buildParkingTesterFromPayload } from "./geo.js";

const isBrowser = typeof window !== "undefined";
const BASE = isBrowser ? "/poppy" : "https://poppy.red";

const CITY_ID = "a88ea9d0-3d5e-4002-8bbf-775313a5973c";
const GEO_ID  = "62c4bd62-881c-473e-8a6b-fbedfd276739";

export const VEHICLES_URL = `${BASE}/api/v3/cities/${CITY_ID}/vehicles`;
export const GEOZONES_URL = `${BASE}/api/v3/geozones/${GEO_ID}`;
export const PRICING_URL = (tier: "S" | "M" | "L") =>
  `${BASE}/api/v3/pricing/pay-per-use?modelType=car&tier=${tier}`;

// --- helper: defensive detection of "car" depending on payload shape
function isCar(v: any): boolean {
  const t1 = v?.model?.type;      // e.g. "car" | "van"
  const t2 = v?.modelType;        // some responses use this field
  const type = (t1 ?? t2 ?? "").toString().toLowerCase();
  return type === "car";
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const r = await fetch(VEHICLES_URL, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`vehicles ${r.status}`);

  const raw = await r.json();

  // Some responses are { vehicles: [...] }, others are a direct array
  const list: any[] = Array.isArray(raw) ? raw : (raw.vehicles ?? []);

  return list
    .filter(isCar)                               // <- CAR ONLY
    .map((v: any) => ({
      id: v.uuid,
      tier: (v.model?.tier ?? v.tier) as "S" | "M" | "L",
      lat: v.locationLatitude,
      lng: v.locationLongitude,
    }))
    // Remove entries without valid coordinates, just in case
    .filter((v: Vehicle) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
}

export async function fetchParkingTester(): Promise<(lat: number, lng: number) => boolean> {
  const r = await fetch(GEOZONES_URL, { headers: { accept: "application/json" } });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.warn("geozones failed:", r.status, body.slice(0, 200));
    return () => true; // dev fallback
  }
  const payload = await r.json();
  return buildParkingTesterFromPayload(payload);
}

export async function fetchPricingForTier(
  tier: "S" | "M" | "L",
): Promise<{
  perMinute: Pricing;
  perKilometer: Pricing;
  smart?: Pricing;
  additionalFees?: { name: string; amount: number }[];
}> {
  // PRICING_URL already sets modelType=car
  const r = await fetch(PRICING_URL(tier), { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`pricing ${tier} ${r.status}`);
  const j = await r.json();
  return {
    perMinute: j.pricingPerMinute,
    perKilometer: j.pricingPerKilometer,
    smart: j.smartPricing,
    additionalFees: j.additionalFees?.fees ?? [],
  };
}
