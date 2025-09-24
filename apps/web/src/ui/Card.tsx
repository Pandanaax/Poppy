import React, { PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ children, className = "" }: PropsWithChildren & { className?: string }) {
  return (
    <div className={twMerge("bg-white/80 backdrop-blur rounded-2xl border border-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.08)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: PropsWithChildren & { className?: string }) {
  return <div className={twMerge("px-5 pt-5 pb-3", className)}>{children}</div>;
}

export function CardTitle({ children, className = "" }: PropsWithChildren & { className?: string }) {
  return <h3 className={twMerge("text-xl sm:text-2xl font-semibold tracking-tight text-brand", className)}>{children}</h3>;
}

export function CardContent({ children, className = "" }: PropsWithChildren & { className?: string }) {
  return <div className={twMerge("px-5 pb-5", className)}>{children}</div>;
}

export function CardFooter({ children, className = "" }: PropsWithChildren & { className?: string }) {
  return <div className={twMerge("px-5 pb-5 pt-0", className)}>{children}</div>;
}
