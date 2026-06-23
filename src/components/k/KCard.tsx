import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg" | "none";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-7",
};

export function KCard({ padding = "md", className, ...rest }: Props) {
  return (
    <div
      className={cn(
        "bg-white border border-kbdr rounded-xl",
        paddingMap[padding],
        className
      )}
      {...rest}
    />
  );
}
