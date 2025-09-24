// packages/shared/src/geo.ts
export const WALK_KMH = 5;
export const DRIVE_KMH = 25;

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ring: number[][]  -> [[lng,lat], ...]
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// poly: number[][][] -> [ outerRing, hole1, hole2, ... ]
function pointInPolygon(lat: number, lng: number, poly: number[][][]): boolean {
  const outer = poly[0];
  const holes = poly.slice(1);
  if (!pointInRing(lng, lat, outer)) return false;
  for (const h of holes) if (pointInRing(lng, lat, h)) return false;
  return true;
}

// mp: number[][][][] -> [ polygon1, polygon2, ... ]
function pointInMultiPolygon(lat: number, lng: number, mp: number[][][][]): boolean {
  return mp.some((poly) => pointInPolygon(lat, lng, poly));
}

/**
 * Builds a "is in parking zone" tester from the geozones payload.
 * Supports both `Polygon` and `MultiPolygon`. Everything is normalized to MultiPolygon.
 */
export function buildParkingTesterFromPayload(
  payload: any
): (lat: number, lng: number) => boolean {
  // List of MultiPolygons. Each element (mp) is number[][][][].
  const multiPolys: number[][][][][] = [];
  const feats: any[] = Array.isArray(payload) ? payload : payload?.features ?? [];

  for (const f of feats) {
    const type = f?.geofencingType ?? f?.properties?.type;
    const geom = f?.geom?.geometry ?? f?.geometry;
    if (type !== "parking" || !geom) continue;

    if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
      const mp = geom.coordinates as unknown as number[][][][];
      multiPolys.push(mp);
    } else if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      const poly = geom.coordinates as unknown as number[][][];
      const wrapped: number[][][][] = [poly]; // normalize -> MultiPolygon
      multiPolys.push(wrapped);
    }
  }

  // Dev fallback: if no zone found, allow everything
  if (multiPolys.length === 0) return () => true;

  return (lat: number, lng: number) =>
    multiPolys.some((mp: number[][][][]) => pointInMultiPolygon(lat, lng, mp));
}
