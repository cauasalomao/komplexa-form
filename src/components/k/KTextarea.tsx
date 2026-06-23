import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const KTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const inputId = id ?? `t-${Math.random().toString(36).slice(2, 8)}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-semibold text-navy">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "min-h-[80px] w-full rounded-[10px] border bg-white px-3 py-2 text-[13px] text-navy",
            "placeholder:text-kgray resize-y",
            "focus:outline-none focus:ring-2 focus:ring-kblue/30 focus:border-kblue",
            error ? "border-danger" : "border-kbdr",
            className
          )}
          {...rest}
        />
        {error ? (
          <span className="text-[11px] text-danger">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-kgray">{hint}</span>
        ) : null}
      </div>
    );
  }
);
KTextarea.displayName = "KTextarea";
