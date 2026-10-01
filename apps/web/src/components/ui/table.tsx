import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table primitives. Hierarchy comes from typography and one firm rule under the header,
 * not from boxes: rows are separated by hairlines, cells align on the first text baseline,
 * and numeric columns (header + cells) are right-aligned with tabular figures.
 */
export const Table = ({ className, ...p }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-x-auto">
    <table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...p} />
  </div>
);

export const TableCaption = ({ className, ...p }: React.HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption className={cn("mt-3 text-left text-xs text-muted-foreground", className)} {...p} />
);

export const TableHeader = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b [&_tr]:border-foreground/15 [&_tr:hover]:bg-transparent", className)} {...p} />
);

export const TableBody = ({ className, ...p }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...p} />
);

export const TableRow = ({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border/70 transition-colors duration-150 hover:bg-muted/40", className)} {...p} />
);

export const TableHead = ({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn(
      "h-10 whitespace-nowrap px-3 text-left align-bottom pb-2.5 text-xs font-medium text-muted-foreground data-[align=right]:text-right",
      className,
    )}
    {...p}
  />
);

export const TableCell = ({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn(
      "whitespace-nowrap px-3 py-3 align-baseline data-[align=right]:text-right data-[align=right]:tabular-nums",
      className,
    )}
    {...p}
  />
);
