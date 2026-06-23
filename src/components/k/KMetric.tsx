import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function KMetric({ label, value, hint, className }: Props) {
  return (
    <div className={cn("k-card", className)}>
      <div className="text-[36px] font-extrabold leading-none tracking-tight k-grad-text">
        {value}
      </div>
      <div className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-kgray">
        {label}
      </div>
      {hint && <div className="mt-1 text-[12px] text-ktxt">{hint}</div>}
    </div>
  );
}
