import React, { PropsWithChildren } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border",
  {
    variants: {
      variant: {
        default:   "bg-red-50 text-red-700 border-red-100",
        secondary: "bg-slate-100 text-slate-700 border-slate-200",
        outline:   "bg-transparent text-slate-700 border-slate-300",
        success:   "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning:   "bg-amber-50 text-amber-800 border-amber-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type Props = PropsWithChildren & VariantProps<typeof badgeVariants> & { className?: string };

export function Badge({ children, variant, className }: Props) {
  return <span className={twMerge(badgeVariants({ variant }), className)}>{children}</span>;
}
