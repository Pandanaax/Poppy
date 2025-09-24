// packages/shared/src/geo.test.ts
import { describe, it, expect } from "vitest";
import { buildParkingTesterFromPayload } from "./geo";

describe("geo.buildParkingTesterFromPayload", () => {
  it("supports MultiPolygon and holes", () => {
    // GeoJSON: coordinates are [lng, lat], rings are closed (first == last)
    const payload = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { type: "parking" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              // Polygon #1 with a hole
              [
                // outer ring: square (0,0) to (2,2)
                [
                  [0, 0],
                  [2, 0],
                  [2, 2],
                  [0, 2],
                  [0, 0],
                ],
                // hole: square (1,1) to (1.5,1.5)
                [
                  [1, 1],
                  [1.5, 1],
                  [1.5, 1.5],
                  [1, 1.5],
                  [1, 1],
                ],
              ],
              // Polygon #2 somewhere else (won't affect these points)
              [
                [
                  [10, 10],
                  [11, 10],
                  [11, 11],
                  [10, 11],
                  [10, 10],
                ],
              ],
            ],
          },
        },
      ],
    };

    const tester = buildParkingTesterFromPayload(payload);

    // Arguments are (lat, lng)
    expect(tester(0.5, 0.5)).toBe(true);   // inside outer, outside hole
    expect(tester(1.25, 1.25)).toBe(false); // inside the hole
    expect(tester(4, 4)).toBe(false);       // outside
  });
});
