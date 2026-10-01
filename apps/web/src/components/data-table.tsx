import { flexRender, type Header, type Row, type RowData, type Table as TanTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-align header and cells (numbers, amounts, dates). */
    align?: "left" | "right";
    /** Extra classes for this column's cells, e.g. a width. */
    className?: string;
  }
}

function SortButton<T>({ header }: { header: Header<T, unknown> }) {
  const sorted = header.column.getIsSorted();
  const right = header.column.columnDef.meta?.align === "right";
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={header.column.getToggleSortingHandler()}
      className={cn(
        "group/sort -mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        right && "flex-row-reverse",
        sorted && "text-foreground",
      )}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <Icon
        aria-hidden
        className={cn("h-3.5 w-3.5 transition-opacity duration-150", sorted ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60")}
      />
    </button>
  );
}

/**
 * Renders a TanStack table with sortable headers (server or client sorting — the table
 * instance decides), aligned numeric columns and optional row activation.
 */
export function DataTable<T>({
  table,
  caption,
  onRowActivate,
  rowLabel,
  rowClassName,
  flush,
}: {
  table: TanTable<T>;
  caption?: ReactNode;
  /** Makes rows clickable and keyboard-activatable (Enter / Space). */
  onRowActivate?: (row: Row<T>) => void;
  rowLabel?: (row: Row<T>) => string;
  rowClassName?: (row: Row<T>) => string | false | undefined;
  /** Remove outer cell padding so text aligns with the page edge (for tables on the open canvas). */
  flush?: boolean;
}) {
  const onKey = (row: Row<T>) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowActivate?.(row);
    }
  };
  return (
    <Table className={cn(flush && "[&_tr>*:first-child]:pl-0 [&_tr>*:last-child]:pr-0")}>
      {caption && <TableCaption className="sr-only">{caption}</TableCaption>}
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((h) => {
              const sorted = h.column.getIsSorted();
              return (
                <TableHead
                  key={h.id}
                  data-align={h.column.columnDef.meta?.align}
                  aria-sort={h.column.getCanSort() ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
                  className={h.column.columnDef.meta?.className}
                >
                  {h.isPlaceholder ? null : h.column.getCanSort() ? <SortButton header={h} /> : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((r) => (
          <TableRow
            key={r.id}
            tabIndex={onRowActivate ? 0 : undefined}
            aria-label={rowLabel?.(r)}
            onClick={onRowActivate ? () => onRowActivate(r) : undefined}
            onKeyDown={onRowActivate ? onKey(r) : undefined}
            className={cn(onRowActivate && "group/row cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none", rowClassName?.(r))}
          >
            {r.getVisibleCells().map((c) => (
              <TableCell key={c.id} data-align={c.column.columnDef.meta?.align} className={c.column.columnDef.meta?.className}>
                {flexRender(c.column.columnDef.cell, c.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
