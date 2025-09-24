import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  estimateJourney,
  fetchVehicles,
  fetchParkingTester,
  fetchPricingForTier,
  type Leg,
  crowFlyProvider,
} from "@poppy/shared";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { StageRow } from "./StageRow";
import { ResultCard } from "./ResultCard";
import { CITY_LABEL, GEOFENCE_LABEL } from "../constants";
import { makeRouteProvider } from "../lib/ors";

type Fee = { name: string; amount: number };
type ProviderName = "ORS" | "CrowFly";

const asFeeArray = (v: any): Fee[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (Array.isArray(v.fees)) return v.fees;
  return [];
};

export function PlannerForm() {
  // UI state
  const [vehCount, setVehCount] = useState<number | null>(null);
  const [stages, setStages] = useState<Leg[]>([
    { from: { lat: 50.8369, lng: 4.335 }, to: { lat: 50.835, lng: 4.357 }, stopMinutes: 120 },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Additional fees (e.g., airport)
  const [feeOptions, setFeeOptions] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<string>("");

  // Routing provider used
  const [routingMode, setRoutingMode] = useState<ProviderName>("CrowFly");

  // Helpers
  const stagesKey = useMemo(() => JSON.stringify(stages), [stages]);
  const mounted = useRef(false);
  const debounceId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const userScrollRef = useRef(false);

  // Result anchor for small screens
  const resultRef = useRef<HTMLDivElement>(null);
  function scrollToResults(behavior: ScrollBehavior = "smooth") {
    if (typeof window === "undefined") return;
    const mm = (window as any).matchMedia;
    if (typeof mm !== "function") return; // guard for non-browser/test
    const isSmall = mm("(max-width: 1023px)").matches;
    if (!isSmall) return;
    resultRef.current?.scrollIntoView({ behavior, block: "start" });
  }

  // Choose routing provider (ORS if enabled & key provided; fallback: crow-fly)
  const routeProvider = useMemo(() => {
    const use = String(import.meta.env.VITE_USE_ORS ?? "").toLowerCase() === "true";
    const hasKey = !!import.meta.env.VITE_ORS_API_KEY;
    if (use && hasKey) {
      setRoutingMode("ORS");
      return makeRouteProvider(crowFlyProvider);
    }
    setRoutingMode("CrowFly");
    return crowFlyProvider;
  }, []);

  // Stage CRUD
  const addStage = () =>
    setStages((s) => [
      ...s,
      { from: { lat: 50.84, lng: 4.35 }, to: { lat: 50.83, lng: 4.36 }, stopMinutes: 0 },
    ]);
  const updateStage = (i: number, s: Leg) =>
    setStages((prev) => prev.map((x, idx) => (idx === i ? s : x)));
  const removeStage = (i: number) => setStages((prev) => prev.filter((_, idx) => idx !== i));

  // Debug: count vehicles
  const debugVehicles = async () => {
    try {
      const vs = await fetchVehicles();
      setVehCount(vs.length);
    } catch {
      setVehCount(-1);
    }
  };

  // Prefetch default fee list (e.g., tier "M")
  useEffect(() => {
    (async () => {
      try {
        const pricing = await fetchPricingForTier("M");
        setFeeOptions(asFeeArray(pricing.additionalFees));
      } catch {
        setFeeOptions([]);
      }
    })();
  }, []);

  // Periodically refresh live vehicles (20s) and re-run if the fleet size changes
  useEffect(() => {
    let alive = true;
    let lastCount = -1;

    async function refresh() {
      try {
        const vs = await fetchVehicles();
        if (!alive) return;
        setVehCount(vs.length);
        if (vs.length !== lastCount) {
          lastCount = vs.length;
          if (!loading) run();
        }
      } catch {
        /* ignore transient errors */
      }
    }

    refresh(); // immediate first tick
    const id = setInterval(refresh, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If timestamps exist, auto-fill stopMinutes between successive legs
  function diffMinutes(aISO?: string, bISO?: string): number | null {
    if (!aISO || !bISO) return null;
    const a = new Date(aISO).getTime();
    const b = new Date(bISO).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.round((b - a) / 60000);
  }

  useEffect(() => {
    setStages((prev) => {
      let changed = false;
      const next = prev.map((leg) => ({ ...leg }));
      for (let i = 0; i < next.length - 1; i++) {
        const cur = next[i];
        const nxt = next[i + 1];
        const d = diffMinutes(cur.endAt, nxt.startAt);
        if (d !== null) {
          const stop = Math.max(0, d);
          if ((cur.stopMinutes ?? 0) !== stop) {
            next[i] = { ...cur, stopMinutes: stop };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesKey]);

  // Main compute
  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const vehicles = await fetchVehicles();
      const inParking = await fetchParkingTester();

      const tiers = Array.from(new Set(vehicles.map((v) => v.tier))) as Array<"S" | "M" | "L">;
      const pricingByTier: Record<"S" | "M" | "L", any> = {} as any;
      await Promise.all(
        tiers.map(async (t) => {
          pricingByTier[t] = await fetchPricingForTier(t);
        })
      );

      // populate fee dropdown from the first available tier
      const firstTier = tiers[0];
      const fees = asFeeArray(pricingByTier[firstTier]?.additionalFees);
      if (fees.length) setFeeOptions(fees);

      const data = await estimateJourney(
        { legs: stages },
        { vehicles, inParking, pricingByTier, routeProvider }
      );

      // Apply selected global fee (documented limitation)
      const allFees: Fee[] = fees.length ? fees : feeOptions;
      const chosen = allFees.find((f) => f.name === selectedFee);

      const augmented = chosen
        ? {
            ...data,
            priceMilliExclVAT: data.priceMilliExclVAT + chosen.amount,
            extraFees: [{ name: chosen.name, amount: chosen.amount }],
          }
        : data;

      setResult(augmented);
    } catch (e: any) {
      setError(e?.message ?? "Failed to plan journey");
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  }, [stages, selectedFee, feeOptions, routeProvider]);

  // Auto-recalculate (debounced) when legs or fee change
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (debounceId.current) clearTimeout(debounceId.current);
    debounceId.current = setTimeout(() => {
      run();
    }, 400);
    return () => {
      if (debounceId.current) clearTimeout(debounceId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesKey, selectedFee]);

  // Button handler: scroll to results on small screens and run
  const handleRun = () => {
    userScrollRef.current = true;
    scrollToResults();
    run();
  };

  // After compute finishes, keep the result card in view on mobile
  useEffect(() => {
    if (!userScrollRef.current) return;
    if (!loading && resultRef.current) {
      scrollToResults();
      userScrollRef.current = false;
    }
  }, [loading]);

  return (
    <div className="w-full px-3 sm:px-4">
      {/* 1 column by default; fixed two columns ≥ lg (1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(0,1fr)] gap-6">
        {/* Left column (sticky on desktop) */}
        <div className="w-full lg:w-[480px] lg:shrink-0 lg:sticky lg:top-6">
          <Card>
            <div className="px-4 sm:px-5 pt-5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Journey Inputs</CardTitle>

                {/* Routing provider tag */}
                {routingMode === "ORS" ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium shadow-sm border border-emerald-100"
                    title="OpenRouteService enabled (ETA for driving/walking)"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-sm" />
                    ORS
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 text-slate-700 px-3 py-1 text-xs font-medium shadow-sm border border-slate-100"
                    title="Direct line (as-the-crow-flies) mode"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600 shadow-sm" />
                    CrowFly
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm mt-3 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-red-600" /> {CITY_LABEL}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-rose-600" /> {GEOFENCE_LABEL}
                </span>
                <span className="text-slate-500">({vehCount ?? "?"} vehicles live)</span>
                {import.meta.env.DEV && (
                  <button
                    className="ml-auto text-red-700 hover:underline hidden md:inline"
                    onClick={debugVehicles}
                  >
                    Debug vehicles
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 sm:px-5 pb-5">
              {/* Fees */}
              <div className="w-full">
                <label className="text-xs font-medium text-slate-600">
                  Special location (fees)
                </label>
                <select
                  className="mt-1 w-full h-11 border rounded-lg px-3 text-sm focus:outline-none focus:ring-4
                             focus:ring-rose-200 focus:border-rose-300 transition shadow-sm bg-white"
                  value={selectedFee}
                  onChange={(e) => setSelectedFee(e.target.value)}
                >
                  <option value="">None</option>
                  {feeOptions.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name} (+{(f.amount / 1000).toFixed(2)} € excl. VAT)
                    </option>
                  ))}
                </select>
              </div>

              {/* Stages */}
              <div className="space-y-4 mt-6">
                {stages.map((s, i) => (
                  <StageRow
                    key={i}
                    stage={s}
                    index={i}
                    canRemove={stages.length > 1}
                    onChange={(ns) => setStages(prev => prev.map((x, idx) => (idx === i ? ns : x)))}
                    onRemove={() => removeStage(i)}
                  />
                ))}
                <button onClick={addStage} className="text-sm text-red-700 hover:underline mt-1">
                  + Add stage
                </button>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleRun} disabled={loading} className="shadow-sm min-w-[140px]">
                  {loading ? "Calculating…" : "Plan journey"}
                </Button>
                {error && <div className="text-sm text-rose-600">{error}</div>}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="min-w-0">
          <div ref={resultRef} className="min-h-[260px] scroll-mt-24">
            <ResultCard data={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
