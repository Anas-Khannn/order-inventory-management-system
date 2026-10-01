import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

const dot: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  neutral: "bg-muted-foreground/50",
};
const text: Record<StatusTone, string> = {
  success: "text-foreground",
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-rose-700 dark:text-rose-400",
  neutral: "text-muted-foreground",
};

/** Dot + label. The label carries the meaning; the dot is a quick-scan cue, never the only one. */
export function Status({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("whitespace-nowrap text-sm transition-colors duration-300", text[tone], className)}>
      <span aria-hidden className={cn("mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full align-middle transition-colors duration-300", dot[tone])} />
      {children}
    </span>
  );
}
