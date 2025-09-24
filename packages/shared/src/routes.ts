// packages/shared/src/routes.ts
import { haversineKm, DRIVE_KMH, WALK_KMH } from "./geo.js";

export type LatLng = { lat: number; lng: number };

export interface RouteProvider {
  driveMinutes(a: LatLng, b: LatLng): Promise<number>;
  walkMinutes(a: LatLng, b: LatLng): Promise<number>;
}

/** Crow-fly fallback: 25 km/h car, 5 km/h walking */
export const crowFlyProvider: RouteProvider = {
  async driveMinutes(a, b) {
    const km = haversineKm(a, b);
    return (km / DRIVE_KMH) * 60;
  },
  async walkMinutes(a, b) {
    const km = haversineKm(a, b);
    return (km / WALK_KMH) * 60;
  },
};
