import React from "react";
import { PRICING_LABELS } from "../constants";

export function ResultCard({ data }: { data: any }) {
  if (!data) {
    return (
      <div className="p-6 rounded-xl border border-slate-200 bg-white">
        <div className="text-slate-500">Run a plan to see results.</div>
      </div>
    );
  }

  // Price is returned in thousandths (excl. VAT). Convert to EUR incl. VAT (21%).
  const priceEuroInclVAT = ((data.priceMilliExclVAT ?? 0) / 1000) * 1.21;

  return (
    <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-5">
      <div
        className="text-3xl sm:text-4xl font-extrabold tracking-tight"
        style={{ color: "rgb(var(--brand))" }}
      >
        <span style={{ color: "rgb(var(--brand))" }}>
          {priceEuroInclVAT.toFixed(2)} €{" "}
        </span>
        <span className="text-black text-[10px] sm:text-[11px] leading-none">incl. VAT</span>
      </div>

      {/* Soft red subtitle */}
      <div className="text-sm text-brand/80">
        Best choice:&nbsp;
        <span className="font-semibold text-brand">
          {PRICING_LABELS[data.bestChoice as "perMinute" | "perKilometer"]}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-brand/90 mb-2">Plan</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm text-slate-900">
          {data.plan.map((p: any, idx: number) => (
            <li key={idx}>
              From ({p.from.lat.toFixed(3)}, {p.from.lng.toFixed(3)}) → To (
              {p.to.lat.toFixed(3)}, {p.to.lng.toFixed(3)}) &nbsp; | Stop: {p.stopMinutes} min
              &nbsp; | Action: {p.actionAfterLeg}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-brand/90 mb-2">Scenarios</h3>
        <ul className="text-sm text-slate-900 space-y-1">
          <li>
            {PRICING_LABELS.perMinute}: {(data.scenarios.perMinute / 1000).toFixed(2)} € excl. VAT
          </li>
          <li>
            {PRICING_LABELS.perKilometer}: {(data.scenarios.perKilometer / 1000).toFixed(2)} € excl.
            VAT
          </li>
        </ul>

        {data.extraFees?.length > 0 && (
          <div className="mt-3">
            <h3 className="text-lg font-semibold text-brand/90 mb-2">Additional fees</h3>
            <ul className="text-sm text-slate-900 space-y-1">
              {data.extraFees.map((f: any) => (
                <li key={f.name}>
                  {f.name}: {(f.amount / 1000).toFixed(2)} € excl. VAT
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-xs text-slate-400">Raw JSON</summary>
        <pre className="text-xs text-slate-700 bg-slate-50 p-2 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
