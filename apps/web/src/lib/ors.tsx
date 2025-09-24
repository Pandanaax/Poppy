import type { RouteProvider } from "@poppy/shared";

type OrsConfig = { use: boolean; key?: string };

function getConfig(): OrsConfig {
  const use = String(import.meta.env.VITE_USE_ORS ?? "").toLowerCase() === "true";
  const key = import.meta.env.VITE_ORS_API_KEY as string | undefined;
  return { use, key };
}

async function orsDuration(
  profile: "driving-car" | "foot-walking",
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  apiKey?: string
): Promise<number> {
  const url = `/ors/v2/directions/${profile}/json`;
  const body = {
    coordinates: [
      [a.lng, a.lat],
      [b.lng, b.lat],
    ],
    instructions: false,
    elevation: false,
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  if (apiKey) headers.Authorization = apiKey;

  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`ORS ${profile} request failed (${r.status})`);

  const j = await r.json();
  const seconds = j?.routes?.[0]?.summary?.duration;
  if (!Number.isFinite(seconds)) throw new Error("ORS: duration missing in response");

  return seconds / 60;
}

/**
 * Builds a RouteProvider that tries ORS first and falls back to the provided fallback.
 * You can override config in tests via the optional `opts` arg.
 */
export function makeRouteProvider(
  fallback: RouteProvider,
  opts?: Partial<OrsConfig>
): RouteProvider {
  const { use, key } = { ...getConfig(), ...opts };
  if (!use || !key) return fallback;

  return {
    async driveMinutes(a, b) {
      try {
        return await orsDuration("driving-car", a, b, key);
      } catch {
        return fallback.driveMinutes(a, b);
      }
    },
    async walkMinutes(a, b) {
      try {
        return await orsDuration("foot-walking", a, b, key);
      } catch {
        return fallback.walkMinutes(a, b);
      }
    },
  };
}
