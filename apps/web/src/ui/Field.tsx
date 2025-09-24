import React from "react";
import { twMerge } from "tailwind-merge";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  labelClassName?: string;
};

export function Field({
  label,
  hint,
  error,
  containerClassName = "",
  className,
  labelClassName = "",
  ...rest
}: Props) {
  const base =
    "w-full h-11 rounded-xl border bg-white/70 px-4 text-sm placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-4 focus:ring-[rgb(var(--ring))]/30 transition";
  const styles = error
    ? "border-rose-300 focus:border-rose-400"
    : "border-slate-200 focus:border-red-400";

  return (
    <label className={twMerge("text-sm block", containerClassName)}>
      <span
        className={twMerge(
          "block text-muted mb-1 whitespace-normal sm:whitespace-nowrap leading-5",
          labelClassName
        )}
        title={label}
      >
        {label}
      </span>
      <input {...rest} className={twMerge(base, styles, className)} />
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
