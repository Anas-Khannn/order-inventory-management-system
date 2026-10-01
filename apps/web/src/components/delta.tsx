import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Percentage-change indicator (adapted from Efferd's dashboard `Delta`). */
export function Delta({
  value,
  variant = "default",
  suffix = "%",
  className,
}: {
  value: number;
  variant?: "default" | "badge";
  suffix?: string;
  className?: string;
}) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const tone =
    value > 0 ? "text-emerald-600 dark:text-emerald-400" : value < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground";
  const bg = value > 0 ? "bg-emerald-500/10" : value < 0 ? "bg-rose-500/10" : "bg-muted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        tone,
        variant === "badge" && cn("rounded-md px-1.5 py-0.5 text-xs font-medium", bg),
        className,
      )}
    >
      <Icon className={variant === "badge" ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden />
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

/** % change, or null when there is no baseline to compare against. */
export const pctChange = (from: number, to: number): number | null => (from === 0 ? null : ((to - from) / from) * 100);

