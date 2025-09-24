import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Reload the module after mutating import.meta.env so the module reads the new values.
 * Adjust the import path if your test file is not next to `ors.ts`.
 */
async function loadWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  // @ts-ignore – override Vite env for this import cycle
  import.meta.env = { ...import.meta.env, ...env };
  return await import("./ors");
}

// Helpers to stub fetch
const makeFetchOk = (seconds: number) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ routes: [{ summary: { duration: seconds } }] }),
  });

const makeFetchBad = (status = 500) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({}),
  });

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("makeRouteProvider (ORS)", () => {
  it("returns the fallback when ORS is disabled", async () => {
    const { makeRouteProvider } = await loadWithEnv({
      VITE_USE_ORS: "false",
      VITE_ORS_API_KEY: "key-abc",
    });

    const fallback = {
      driveMinutes: vi.fn(async () => 12),
      walkMinutes: vi.fn(async () => 34),
    };

    // ORS disabled by env -> should return fallback behavior
    const provider = makeRouteProvider(fallback as any);

    expect(await provider.driveMinutes({} as any, {} as any)).toBe(12);
    expect(await provider.walkMinutes({} as any, {} as any)).toBe(34);
  });

  it("returns the fallback when ORS key is missing", async () => {
    const { makeRouteProvider } = await loadWithEnv({
      VITE_USE_ORS: "true",
      VITE_ORS_API_KEY: undefined, // no key
    });

    const fallback = {
      driveMinutes: vi.fn(async () => 7),
      walkMinutes: vi.fn(async () => 8),
    };

    // Key missing -> should return fallback behavior
    const provider = makeRouteProvider(fallback as any);

    expect(await provider.driveMinutes({} as any, {} as any)).toBe(7);
    expect(await provider.walkMinutes({} as any, {} as any)).toBe(8);
  });

  it("uses ORS when enabled + key present (drive & walk) and sends Authorization header", async () => {
    // First call returns 600s -> 10 minutes
    const fetchMock = makeFetchOk(600);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { makeRouteProvider } = await loadWithEnv({
      VITE_USE_ORS: "true",
      VITE_ORS_API_KEY: "key-xyz",
    });

    const fallback = {
      driveMinutes: vi.fn(async () => 99),
      walkMinutes: vi.fn(async () => 99),
    };

    // Force ORS path deterministically
    const provider = makeRouteProvider(fallback as any, { use: true, key: "key-xyz" });

    const a = { lat: 50, lng: 4 };
    const b = { lat: 50.1, lng: 4.1 };

    const drive = await provider.driveMinutes(a as any, b as any);
    expect(drive).toBeCloseTo(10, 5);
    expect(fetchMock).toHaveBeenCalledWith(
      "/ors/v2/directions/driving-car/json",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          Authorization: "key-xyz",
        }),
      })
    );

    // Verify POST body
    const lastCall = (fetchMock as any).mock.calls.at(-1);
    const reqInit = lastCall?.[1] as RequestInit;
    const body = JSON.parse(String(reqInit.body));
    expect(body.coordinates).toEqual([
      [4, 50],
      [4.1, 50.1],
    ]);
    expect(body.instructions).toBe(false);
    expect(body.elevation).toBe(false);

    // Next call (walk): 180s -> 3 minutes
    (fetchMock as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [{ summary: { duration: 180 } }] }),
    });

    const walk = await provider.walkMinutes(a as any, b as any);
    expect(walk).toBeCloseTo(3, 5);
    expect(fetchMock).toHaveBeenCalledWith(
      "/ors/v2/directions/foot-walking/json",
      expect.any(Object)
    );
  });

  it("falls back when ORS returns a non-ok HTTP status", async () => {
    const fetchMock = makeFetchBad(502);
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { makeRouteProvider } = await loadWithEnv({
      VITE_USE_ORS: "true",
      VITE_ORS_API_KEY: "key-xyz",
    });

    const fallback = {
      driveMinutes: vi.fn(async () => 42),
      walkMinutes: vi.fn(async () => 24),
    };

    const provider = makeRouteProvider(fallback as any, { use: true, key: "key-xyz" });

    const a = { lat: 50, lng: 4 };
    const b = { lat: 50.1, lng: 4.1 };

    expect(await provider.driveMinutes(a as any, b as any)).toBe(42);
    expect(await provider.walkMinutes(a as any, b as any)).toBe(24);
    expect(fallback.driveMinutes).toHaveBeenCalled();
    expect(fallback.walkMinutes).toHaveBeenCalled();
  });

  it("falls back when ORS response is missing duration", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ summary: {} }] }),
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { makeRouteProvider } = await loadWithEnv({
      VITE_USE_ORS: "true",
      VITE_ORS_API_KEY: "key-xyz",
    });

    const fallback = {
      driveMinutes: vi.fn(async () => 11),
      walkMinutes: vi.fn(async () => 22),
    };

    const provider = makeRouteProvider(fallback as any, { use: true, key: "key-xyz" });
    const a = { lat: 50, lng: 4 };
    const b = { lat: 50.1, lng: 4.1 };

    expect(await provider.driveMinutes(a as any, b as any)).toBe(11);
    expect(await provider.walkMinutes(a as any, b as any)).toBe(22);
  });
});
