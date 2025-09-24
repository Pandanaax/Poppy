import React from "react";
import type { Leg as Stage } from "@poppy/shared";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { DateTimePicker } from "../ui/DateTimePicker";

const toNumber = (v: string | number) => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function StageRow({
  stage,
  index,
  onChange,
  onRemove,
  canRemove = true,
}: {
  stage: Stage;
  index: number;
  onChange: (s: Stage) => void;
  onRemove: () => void;
  canRemove?: boolean;
}) {
  const set = (k: keyof Stage, v: any) => onChange({ ...stage, [k]: v });
  const setLL = (key: "from" | "to", field: "lat" | "lng", v: string) =>
    onChange({ ...stage, [key]: { ...stage[key], [field]: toNumber(v) } });

  return (
    <Card className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
          <div className="font-semibold text-brand text-lg">Leg {index + 1}</div>
          <Badge className="ml-1">GPS</Badge>
        </div>

        <Button
          type="button"
          onClick={canRemove ? onRemove : undefined}
          disabled={!canRemove}
          className={
            "text-sm px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 " +
            (!canRemove ? "opacity-50 cursor-not-allowed" : "")
          }
          title={canRemove ? "Remove this leg" : "You must keep at least one leg"}
        >
          Remove
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* From */}
        <div className="lg:col-span-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            <div className="text-sm font-semibold text-brand/90">From</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field
              label="From lat"
              inputMode="decimal"
              step="any"
              value={stage.from.lat}
              onChange={(e) => setLL("from", "lat", e.target.value)}
            />
            <Field
              label="From lng"
              inputMode="decimal"
              step="any"
              value={stage.from.lng}
              onChange={(e) => setLL("from", "lng", e.target.value)}
            />
          </div>
        </div>

        {/* To */}
        <div className="lg:col-span-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <div className="text-sm font-semibold text-brand/90">To</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field
              label="To lat"
              inputMode="decimal"
              step="any"
              value={stage.to.lat}
              onChange={(e) => setLL("to", "lat", e.target.value)}
            />
            <Field
              label="To lng"
              inputMode="decimal"
              step="any"
              value={stage.to.lng}
              onChange={(e) => setLL("to", "lng", e.target.value)}
            />
          </div>
        </div>

        {/* Timestamps (optional) */}
        <div className="lg:col-span-6">
          <DateTimePicker
            label="Start at (optional)"
            value={stage.startAt}
            onChange={(iso) => set("startAt", iso)}
            className="w-full"
            // keep "mode" if your DateTimePicker supports it
            // mode="date"
          />
        </div>
        <div className="lg:col-span-6">
          <DateTimePicker
            label="Arrive at (optional)"
            value={stage.endAt}
            onChange={(iso) => set("endAt", iso)}
            className="w-full"
            // mode="date"
          />
        </div>

        {/* Manual stop-minutes fallback if timestamps are not provided */}
        <div className="lg:col-span-12">
          <Field
            label="Stop minutes (manual fallback)"
            type="number"
            step="1"
            value={stage.stopMinutes ?? 0}
            onChange={(e) => set("stopMinutes", toNumber(e.target.value))}
          />
        </div>
      </div>
    </Card>
  );
}
