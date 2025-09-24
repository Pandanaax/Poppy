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

/** Local helper type: some payloads don't include caps, keep them optional */
type CapsFriendlyPricing = Pricing & Partial<{ hourCapPrice: number; dayCapPrice: number }>;

/** -------- cost helpers (values in thousandths, excl. VAT) -------- */

// Works in minutes (easier since wMin is already known from ORS or fallback)
function reservationCost(walkMinutes: number, pricing: CapsFriendlyPricing) {
  const paid = Math.max(0, walkMinutes - 15); // first 15 min are free
  return (pricing.bookUnitPrice ?? 0) * paid;
}

function baseDriveCost(
  km: number,
  driveMin: number,
  pricing: CapsFriendlyPricing,
  choice: TariffChoice
) {
  if (choice === "perMinute") {
    // minutePrice (not moveUnitPrice)
    return (pricing.minutePrice ?? 0) * driveMin;
  }
  const included = pricing.includedKilometers ?? 0;
  const extraKm = Math.max(0, km - included);
  return (pricing.kilometerPrice ?? 0) * extraKm;
}

function pauseCost(pauseMin: number | undefined, pricing: CapsFriendlyPricing) {
  return (pricing.pauseUnitPrice ?? 0) * (pauseMin ?? 0);
}

/** Apply hourly / daily caps to a usage session (if present) */
function applyCaps(rawCost: number, totalMinutes: number, pricing: CapsFriendlyPricing) {
  let capped = rawCost;

  // Optional caps: if not provided by API, treat as 0
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

/** Nearest vehicle (simple Haversine) */
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

/** --------- DP with sessions + caps ---------
 * We compute two scenarios independently: per-minute and per-km.
 * At each leg, we either (a) start a new session, or (b) keep an existing session.
 * We can only END (close a session) when the destination is in a parking zone.
 */
type HasState = {
  fixedCost: number;               // sum of sessions already closed (caps applied)
  sessionMin: number;              // minutes of the current session (booking + drive + pause)
  sessionCost: number;             // raw cost of the current session (booking + unlock + drive + pause)
  pricing: CapsFriendlyPricing;    // pricing used for THIS session (needed to apply caps correctly)
};

export async function estimateJourney(
  journey: Journey,
  ctx: {
    vehicles: Vehicle[];
    pricingByTier: Record<"S" | "M" | "L", { perMinute: CapsFriendlyPricing; perKilometer: CapsFriendlyPricing }>;
    inParking: (lat: number, lng: number) => boolean;
    routeProvider?: RouteProvider;
  }
): Promise<EstimateResult> {
  const { legs } = journey;

  function pickBestHAS(current: HasState | null, candidate: HasState): HasState {
    if (!current) return candidate;
    // Compare both states as if we closed them now (to choose the best ongoing session)
    const curScore = current.fixedCost + applyCaps(current.sessionCost, current.sessionMin, current.pricing);
    const candScore = candidate.fixedCost + applyCaps(candidate.sessionCost, candidate.sessionMin, candidate.pricing);
    return candScore <= curScore ? candidate : current;
  }

  async function solve(choice: TariffChoice) {
    const N = legs.length;
    const dpNO: number[] = new Array(N + 1).fill(Number.POSITIVE_INFINITY);
    const dpHAS: (HasState | null)[] = new Array(N + 1).fill(null);
    dpNO[0] = 0;

    for (let i = 0; i < N; i++) {
      const leg = legs[i];

      // Vehicle & pricing if we (re)start a session on this leg
      const { v } = nearestVehicle(leg.from, ctx.vehicles);
      const tier = (v.tier as "S" | "M" | "L") ?? "S";
      const pricing = ctx.pricingByTier[tier][choice];

      // Distances / durations
      const kmDrive = haversineKm(leg.from, leg.to);
      const dMin = await driveMinutes(leg, ctx.routeProvider);
      const wMin = await walkMinutesToVehicle(leg.from, v, ctx.routeProvider);

      // Leg costs
      const reserve = reservationCost(wMin, pricing) + (pricing.unlockFee ?? 0);
      const drive = baseDriveCost(kmDrive, dMin, pricing, choice);
      const pause = pauseCost(leg.stopMinutes, pricing);

      // 1) Start a new session (NO -> HAS)
      if (Number.isFinite(dpNO[i])) {
        const newHAS: HasState = {
          fixedCost: dpNO[i],
          sessionMin: Math.max(0, wMin - 15) + dMin + (leg.stopMinutes ?? 0), // paid minutes
          sessionCost: reserve + drive + pause,
          pricing,
        };
        dpHAS[i + 1] = pickBestHAS(dpHAS[i + 1], newHAS);

        // Optionally END here if destination allows parking
        if (ctx.inParking(leg.to.lat, leg.to.lng)) {
          const closed = newHAS.fixedCost + applyCaps(newHAS.sessionCost, newHAS.sessionMin, newHAS.pricing);
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
          pricing: cur.pricing,                          // keep same pricing
        };
        dpHAS[i + 1] = pickBestHAS(dpHAS[i + 1], keep);

        if (ctx.inParking(leg.to.lat, leg.to.lng)) {
          const closed = keep.fixedCost + applyCaps(keep.sessionCost, keep.sessionMin, keep.pricing);
          if (closed < dpNO[i + 1]) dpNO[i + 1] = closed;
        }
      }
    }

    // Final closure if still in HAS (close with the SAME pricing as the open session)
    let bestTotal = dpNO[N];
    if (dpHAS[N]) {
      const cur = dpHAS[N]!;
      const closed = cur.fixedCost + applyCaps(cur.sessionCost, cur.sessionMin, cur.pricing);
      if (closed < bestTotal) bestTotal = closed;
    }

    return { total: bestTotal };
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
      // For the UI you can reconstruct KEEP/END per leg if needed; default to KEEP here
      actionAfterLeg: "KEEP" as const,
    })),
    scenarios: { perMinute: Math.round(A.total), perKilometer: Math.round(B.total) },
  };
}
