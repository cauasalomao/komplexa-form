import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  solid:
    "bg-k-grad text-white hover:opacity-95 active:opacity-90 shadow-sm",
  outline:
    "border border-kbdr text-navy hover:border-kblue hover:text-kblue bg-white",
  ghost: "text-navy hover:bg-kbg",
  danger: "bg-danger text-white hover:opacity-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-6 text-[14px]",
};

export const KButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "solid", size = "md", loading, fullWidth, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-opacity",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
KButton.displayName = "KButton";
