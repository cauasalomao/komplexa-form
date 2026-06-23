import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const KSelect = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, hint, className, id, children, ...rest }, ref) => {
    const selectId = id ?? `s-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[12px] font-semibold text-navy">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-[10px] border bg-white px-3 text-[13px] text-navy",
            "focus:outline-none focus:ring-2 focus:ring-kblue/30 focus:border-kblue",
            error ? "border-danger" : "border-kbdr",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        {error ? (
          <span className="text-[11px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-kgray">{hint}</span>
        ) : null}
      </div>
    );
  }
);
KSelect.displayName = "KSelect";
