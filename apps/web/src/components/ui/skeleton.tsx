import { cn } from "@/lib/utils";

/** Shimmering placeholder; reserves layout space so content does not jump in. */
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden
    className={cn(
      "relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent",
      className,
    )}
    {...p}
  />
);
