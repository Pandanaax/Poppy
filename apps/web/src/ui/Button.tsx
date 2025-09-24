import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-medium transition focus:outline-none focus:ring-4 ring-[rgb(var(--ring))]/30 disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-md hover:shadow-lg",
        secondary: "bg-slate-900 text-white hover:opacity-95",
        outline: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
        destructive: "bg-rose-600 text-white hover:bg-rose-700",
      },
      size: {
        sm: "text-sm px-3 py-2 rounded-lg",
        md: "text-sm px-4 py-2.5",
        lg: "text-base px-5 py-3 rounded-2xl",
        icon: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, leftIcon, rightIcon, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={twMerge(buttonVariants({ variant, size }), className)}
      disabled={loading || rest.disabled}
    >
      {loading ? (
        <Spinner className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      ) : (
        <>
          {leftIcon ? <span className="mr-2 inline-flex">{leftIcon}</span> : null}
          {children}
          {rightIcon ? <span className="ml-2 inline-flex">{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
});
