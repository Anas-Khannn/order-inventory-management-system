import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const LoadingRows = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2 py-2" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.12 }} />
    ))}
  </div>
);

export const EmptyState = ({ message, hint, action }: { message: string; hint?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 py-14 text-center text-sm animate-in fade-in-0 duration-300">
    <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Inbox className="h-5 w-5" aria-hidden />
    </span>
    <p className="font-medium">{message}</p>
    {hint && <p className="max-w-xs text-muted-foreground">{hint}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center text-sm animate-in fade-in-0 duration-300">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
      <AlertCircle className="h-5 w-5" aria-hidden />
    </span>
    <p className="max-w-sm text-destructive">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

/** Thin indeterminate bar shown while cached data is being refreshed in the background. */
export const RefreshBar = ({ active }: { active: boolean }) => (
  <div aria-hidden className="relative h-0.5 overflow-hidden">
    <div
      className={`absolute inset-y-0 w-1/3 rounded-full bg-chart-1 transition-opacity duration-300 ${active ? "animate-refresh opacity-100" : "opacity-0"}`}
    />
  </div>
);
