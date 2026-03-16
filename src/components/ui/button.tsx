"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[color:var(--accent)] px-4 py-2 text-white shadow-[0_10px_30px_-16px_rgba(21,72,70,0.75)] hover:bg-[color:var(--accent-strong)]",
        secondary: "bg-white/85 px-4 py-2 text-slate-900 ring-1 ring-black/8 hover:bg-white",
        ghost: "px-3 py-2 text-slate-700 hover:bg-black/5",
        danger: "bg-[#7c2d12] px-4 py-2 text-white hover:bg-[#5e2110]",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: React.ReactNode;
}

function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn("size-4 animate-spin", className)} />;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }), loading && "cursor-wait opacity-100")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

export function FormSubmitButton(props: ButtonProps) {
  const { pending } = useFormStatus();

  return <Button {...props} loading={props.loading || pending} />;
}
