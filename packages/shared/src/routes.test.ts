import { describe, it, expect } from "vitest";
import { crowFlyProvider } from "./routes.js";

// 1° latitude ≈ 111.195 km — good for deterministic checks
const A = { lat: 0, lng: 0 };
const B = { lat: 1, lng: 0 };

describe("routes.crowFlyProvider", () => {
  it("returns 0 minutes when points are identical", async () => {
    expect(await crowFlyProvider.driveMinutes(A, A)).toBeCloseTo(0, 6);
    expect(await crowFlyProvider.walkMinutes(A, A)).toBeCloseTo(0, 6);
  });

  it("uses 25 km/h for driving and 5 km/h for walking (crow-fly)", async () => {
    const drive = await crowFlyProvider.driveMinutes(A, B);
    const walk  = await crowFlyProvider.walkMinutes(A, B);

    // Driving: (111.195 / 25) * 60 ≈ 266.868
    expect(drive).toBeGreaterThan(260);
    expect(drive).toBeLessThan(275);

    // Walking: (111.195 / 5) * 60 ≈ 1334.34
    expect(walk).toBeGreaterThan(1300);
    expect(walk).toBeLessThan(1360);

    // Walking must be ~5× driving (same distance, 5x slower)
    expect(walk / drive).toBeCloseTo(5, 2);
  });

  it("is monotonic with distance (longer -> longer time)", async () => {
    const mid = await crowFlyProvider.driveMinutes(A, { lat: 0.5, lng: 0 });
    const long = await crowFlyProvider.driveMinutes(A, B);
    expect(long).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
  });
});
