import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export const KInput = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, leftIcon, className, id, ...rest }, ref) => {
    const inputId = id ?? `i-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-semibold text-navy">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-kgray">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "h-10 w-full rounded-[10px] border bg-white px-3 text-[13px] text-navy",
              "placeholder:text-kgray",
              "focus:outline-none focus:ring-2 focus:ring-kblue/30 focus:border-kblue",
              error ? "border-danger" : "border-kbdr",
              leftIcon && "pl-9",
              className
            )}
            {...rest}
          />
        </div>
        {error ? (
          <span className="text-[11px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-kgray">{hint}</span>
        ) : null}
      </div>
    );
  }
);
KInput.displayName = "KInput";
