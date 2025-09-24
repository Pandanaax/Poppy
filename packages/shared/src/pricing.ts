// packages/shared/src/pricing.ts
import { DRIVE_KMH, WALK_KMH, haversineKm } from "./geo.js";
import type {
  Journey,
  Pricing,
  TariffChoice,
  Vehicle,
  EstimateResult,
  Leg,
} from "./types.js";
import type { RouteProvider } from "./routes.js";

/** -------- cost helpers -------- */

// Works in minutes (easier since wMin is already known from ORS or fallback)
function reservationCost(walkMinutes: number, pricing: Pricing) {
  const paid = Math.max(0, walkMinutes - 15); // first 15 min are free
  return pricing.bookUnitPrice * paid;
}

function baseDriveCost(
  km: number,
  driveMin: number,
  pricing: Pricing,
  choice: TariffChoice
) {
  if (choice === "perMinute") {
    // minutePrice (not moveUnitPrice)
    return pricing.minutePrice * driveMin;
  }
  const included = pricing.includedKilometers ?? 0;
  const extraKm = Math.max(0, km - included);
  return pricing.kilometerPrice * extraKm;
}

function pauseCost(pauseMin: number | undefined, pricing: Pricing) {
  return pricing.pauseUnitPrice * (pauseMin ?? 0);
}

/** Apply hourly / daily caps to a usage session */
function applyCaps(rawCost: number, totalMinutes: number, pricing: Pricing) {
  let capped = rawCost;

  //  caps are optional: if not in API, default to 0
  const hourCap = pricing.hourCapPrice ?? 0;
  const dayCap = pricing.dayCapPrice ?? 0;

  if (hourCap > 0) {
    const blocks = Math.ceil(totalMinutes / 60);
    capped = Math.min(capped, hourCap * blocks);
  }
  if (dayCap > 0) {
    const blocks = Math.ceil(totalMinutes / (60 * 24));
    capped = Math.min(capped, dayCap * blocks);
  }
  return capped;
}

/** Nearest vehicle */
function nearestVehicle(from: { lat: number; lng: number }, vs: Vehicle[]) {
  if (vs.length === 0) throw new Error("No vehicle available at the moment.");
  let best: { v: Vehicle; km: number } | null = null;
  for (const v of vs) {
    const km = haversineKm(from, { lat: v.lat, lng: v.lng });
    if (!best || km < best.km) best = { v, km };
  }
  return best!;
}

/** Driving minutes via provider (or crow-fly fallback if sync) */
async function driveMinutes(leg: Leg, routeProvider?: RouteProvider) {
  if (routeProvider?.driveMinutes) return routeProvider.driveMinutes(leg.from, leg.to);
  const km = haversineKm(leg.from, leg.to);
  return (km / DRIVE_KMH) * 60;
}

/** Walking minutes to the vehicle (provider if available) */
async function walkMinutesToVehicle(
  from: { lat: number; lng: number },
  v: Vehicle,
  routeProvider?: RouteProvider
) {
  if (routeProvider?.walkMinutes) return routeProvider.walkMinutes(from, { lat: v.lat, lng: v.lng });
  const km = haversineKm(from, { lat: v.lat, lng: v.lng });
  return (km / WALK_KMH) * 60;
}

/** --------- DP with sessions + caps --------- */
type HasState = {
  fixedCost: number;   // sum of sessions already closed (caps applied)
  sessionMin: number;  // minutes of the current session (booking + drive + pause)
  sessionCost: number; // raw cost of the current session (booking + unlock + drive + pause)
};

export async function estimateJourney(
  journey: Journey,
  ctx: {
    vehicles: Vehicle[];
    pricingByTier: Record<"S" | "M" | "L", { perMinute: Pricing; perKilometer: Pricing }>;
    inParking: (lat: number, lng: number) => boolean;
    routeProvider?: RouteProvider;
  }
): Promise<EstimateResult> {
  const { legs } = journey;

  async function solve(choice: TariffChoice) {
    const N = legs.length;
    const dpNO: number[] = new Array(N + 1).fill(Number.POSITIVE_INFINITY);
    const dpHAS: (HasState | null)[] = new Array(N + 1).fill(null);
    dpNO[0] = 0;

    for (let i = 0; i < N; i++) {
      const leg = legs[i];

      // Vehicle & pricing if we (re)start a session on this leg
      const { v } = nearestVehicle(leg.from, ctx.vehicles);
      const tier = v.tier as "S" | "M" | "L";
      const pricing = ctx.pricingByTier[tier][choice];

      // Distances / durations
      const kmDrive = haversineKm(leg.from, leg.to);
      const dMin = await driveMinutes(leg, ctx.routeProvider);
      const wMin = await walkMinutesToVehicle(leg.from, v, ctx.routeProvider);

      // Leg costs
      const reserve = reservationCost(wMin, pricing) + pricing.unlockFee;
      const drive = baseDriveCost(kmDrive, dMin, pricing, choice);
      const pause = pauseCost(leg.stopMinutes, pricing);

      // 1) Start a new session (NO -> HAS)
      if (Number.isFinite(dpNO[i])) {
        const newHAS: HasState = {
          fixedCost: dpNO[i],
          sessionMin: Math.max(0, wMin - 15) + dMin + (leg.stopMinutes ?? 0), // paid minutes
          sessionCost: reserve + drive + pause,
        };
        dpHAS[i + 1] = pickBestHAS(dpHAS[i + 1], newHAS, pricing);

        if (ctx.inParking(leg.to.lat, leg.to.lng)) {
          const closed = newHAS.fixedCost + applyCaps(newHAS.sessionCost, newHAS.sessionMin, pricing);
          if (closed < dpNO[i + 1]) dpNO[i + 1] = closed;
        }
      }

      // 2) Continue the session (HAS -> HAS), with END option
      if (dpHAS[i]) {
        const cur = dpHAS[i]!;
        const keep: HasState = {
          fixedCost: cur.fixedCost,
          sessionMin: cur.sessionMin + dMin + (leg.stopMinutes ?? 0),
          sessionCost: cur.sessionCost + drive + pause, // no re-reservation
        };
        dpHAS[i + 1] = pickBestHAS(dpHAS[i + 1], keep, pricing);

        if (ctx.inParking(leg.to.lat, leg.to.lng)) {
          const closed = keep.fixedCost + applyCaps(keep.sessionCost, keep.sessionMin, pricing);
          if (closed < dpNO[i + 1]) dpNO[i + 1] = closed;
        }
      }
    }

    // Final closure if still in HAS
    const { v: v0 } = nearestVehicle(legs[0].from, ctx.vehicles);
    const endPricing = ctx.pricingByTier[v0.tier as "S" | "M" | "L"][choice];

    let bestTotal = dpNO[N];
    if (dpHAS[N]) {
      const cur = dpHAS[N]!;
      const closed = cur.fixedCost + applyCaps(cur.sessionCost, cur.sessionMin, endPricing);
      if (closed < bestTotal) bestTotal = closed;
    }

    return { total: bestTotal };
  }

  function pickBestHAS(current: HasState | null, candidate: HasState, pricing: Pricing): HasState {
    if (!current) return candidate;
    const curScore = current.fixedCost + applyCaps(current.sessionCost, current.sessionMin, pricing);
    const candScore = candidate.fixedCost + applyCaps(candidate.sessionCost, candidate.sessionMin, pricing);
    return candScore <= curScore ? candidate : current;
  }

  const A = await solve("perMinute");
  const B = await solve("perKilometer");
  const best = A.total <= B.total ? { choice: "perMinute", ...A } : { choice: "perKilometer", ...B };

  return {
    bestChoice: best.choice as TariffChoice,
    priceMilliExclVAT: Math.round(best.total),
    plan: (legs as Leg[]).map((leg: Leg) => ({
      from: leg.from,
      to: leg.to,
      stopMinutes: leg.stopMinutes ?? 0,
      // For the UI you can reconstruct KEEP/END if needed; here we default to KEEP
      actionAfterLeg: "KEEP" as const,
    })),
    scenarios: { perMinute: Math.round(A.total), perKilometer: Math.round(B.total) },
  };
}
