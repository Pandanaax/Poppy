import React from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_red.css";
import { Button } from "./Button";

type Mode = "date" | "datetime";

type Props = {
  label: string;
  value?: string;
  onChange: (iso?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  mode?: Mode;
};

function parseLocalISO(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}
function toLocalISO(d?: Date, withTime = true): string | undefined {
  if (!d) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  if (!withTime) return `${yyyy}-${MM}-${DD}T00:00`;
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${DD}T${HH}:${mm}`;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  required,
  className = "",
  mode = "datetime",
}: Props) {
  const [date, setDate] = React.useState<Date | null>(parseLocalISO(value));
  React.useEffect(() => { setDate(parseLocalISO(value)); }, [value]);

  const isDateOnly = mode === "date";

  return (
    <label className={`text-sm block ${className}`}>
      <span className="block text-muted mb-1">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </span>

      <div className="flex items-center gap-2">
        <Flatpickr
          value={date ?? undefined}
          options={{
            enableTime: !isDateOnly,
            time_24hr: true,
            minuteIncrement: 1,
            dateFormat: isDateOnly ? "Y-m-d" : "Y-m-d H:i",
            allowInput: true,
          }}
          onChange={(dates) => {
            const d = dates?.[0];
            setDate(d ?? null);
            onChange(toLocalISO(d, !isDateOnly));
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm
                     placeholder:text-slate-400 focus:outline-none focus:ring-4
                     focus:ring-[rgb(var(--ring))]/30 focus:border-red-400 transition
                     dp-material-input"
        />

        {date ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setDate(null); onChange(undefined); }}
            className="shrink-0"
          >
            Clear
          </Button>
        ) : null}
      </div>
    </label>
  );
}
