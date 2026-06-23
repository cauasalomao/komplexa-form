import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "grad" | "ok" | "warn" | "danger" | "gray" | "blue";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneMap: Record<Tone, string> = {
  grad: "bg-k-grad text-white",
  ok: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  gray: "bg-[#F1F2F4] text-kgray",
  blue: "bg-[var(--tb09)] text-kblue",
};

export function KBadge({ tone = "gray", className, ...rest }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        toneMap[tone],
        className
      )}
      {...rest}
    />
  );
}
