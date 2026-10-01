import * as React from "react";
import { cn } from "@/lib/utils";

/** Styled native <select>: works great with react-hook-form and on mobile. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25 disabled:cursor-not-allowed disabled:opacity-50 coarse:h-11 coarse:text-base bg-background",
      className,
    )}
    {...props}
  />
));
NativeSelect.displayName = "NativeSelect";
