import { cn } from "@/lib/utils";

export function KEyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("k-eyebrow", className)}>{children}</span>;
}
