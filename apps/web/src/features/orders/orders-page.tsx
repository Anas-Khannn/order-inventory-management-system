import type { OrderDto, OrderSort, OrderStatus, SortDir } from "@repo/shared";
import { createColumnHelper, getCoreRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { EmptyState, ErrorState, LoadingRows, RefreshBar } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useDebounce } from "@/hooks/use-debounce";
import { useHashQuery } from "@/hooks/use-hash-query";
import { useOrders } from "@/hooks/queries";
import { formatDate, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreateOrderDialog } from "./create-order-dialog";
import { OrderDetailDialog, OrderStatusBadge } from "./order-detail-dialog";

const DEFAULTS = { q: "", status: "", sort: "createdAt", dir: "desc", page: "1" };

const col = createColumnHelper<OrderDto>();
const columns = [
  col.accessor("reference", { id: "reference", header: "Reference", cell: (c) => <span className="font-mono text-xs">{c.getValue()}</span> }),
  col.accessor("customerName", {
    id: "customerName",
    header: "Customer",
    meta: { className: "min-w-48" },
    cell: (c) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{c.getValue()}</p>
        <p className="truncate text-xs text-muted-foreground">{c.row.original.customerEmail}</p>
      </div>
    ),
  }),
  col.accessor("status", { id: "status", header: "Status", cell: (c) => <OrderStatusBadge status={c.getValue()} /> }),
  col.accessor("createdAt", {
    id: "createdAt",
    header: "Placed",
    meta: { align: "right", className: "hidden md:table-cell" },
    cell: (c) => <span className="text-muted-foreground">{formatDate(c.getValue())}</span>,
  }),
  col.accessor("totalAmount", {
    id: "totalAmount",
    header: "Total",
    meta: { align: "right" },
    cell: (c) => <span className={cn(c.row.original.status === "CANCELLED" && "text-muted-foreground line-through")}>{formatPKR(c.getValue())}</span>,
  }),
  col.display({
    id: "open",
    enableSorting: false,
    header: () => <span className="sr-only">Open</span>,
    meta: { className: "w-6" },
    cell: () => <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover/row:translate-x-0.5" aria-hidden />,
  }),
];

export function OrdersPage() {
  const [f, setF] = useHashQuery(DEFAULTS);
  const [search, setSearch] = useState(f.q);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const debounced = useDebounce(search);
  useEffect(() => {
    if (debounced !== f.q) setF({ q: debounced, page: "1" });
  }, [debounced, f.q, setF]);

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders({
    search: f.q || undefined,
    status: (f.status || undefined) as OrderStatus | undefined,
    sort: f.sort as OrderSort,
    dir: f.dir as SortDir,
    page: Number(f.page) || 1,
  });

  const sorting: SortingState = [{ id: f.sort, desc: f.dir === "desc" }];
  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = (typeof updater === "function" ? updater(sorting) : updater)[0];
      if (!next) return;
      const desc = next.id !== f.sort ? !["reference", "customerName", "status"].includes(next.id) : next.desc;
      setF({ sort: next.id, dir: desc ? "desc" : "asc", page: "1" });
    },
  });

  const filtered = !!(f.q || f.status);
  const clearFilters = () => {
    setSearch("");
    setF({ q: "", status: "", page: "1" });
  };

  return (
    <section aria-labelledby="orders-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="orders-heading" className="text-base font-semibold">
            Order history
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {data ? `${data.meta.total} order${data.meta.total === 1 ? "" : "s"}${filtered ? " match these filters" : ""}` : "Loading orders"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New order
        </Button>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} label="Search orders" placeholder="Search by reference, customer or email" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Filter by status"
            value={f.status}
            onChange={(v) => setF({ status: v, page: "1" })}
            options={[
              { value: "", label: "All" },
              { value: "CREATED", label: "Created" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
          />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="animate-in fade-in-0 duration-150">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div>
        <RefreshBar active={isFetching && !isLoading} />
        {isLoading ? (
          <LoadingRows />
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : data && data.data.length === 0 ? (
          filtered ? (
            <EmptyState
              message="No orders match these filters"
              hint="Try a different reference, customer or status."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              message="No orders yet"
              hint="Create your first order. Stock updates automatically."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> New order
                </Button>
              }
            />
          )
        ) : (
          <>
            <div className={cn("transition-opacity duration-200", isFetching && "opacity-60")}>
              <DataTable
                flush
                table={table}
                caption="Orders with reference, customer, status, date placed and total"
                onRowActivate={(r) => setSelected(r.original.id)}
                rowLabel={(r) => `Open order ${r.original.reference}`}
              />
            </div>
            {data && <Pagination meta={data.meta} onPage={(p) => setF({ page: String(p) })} disabled={isFetching} />}
          </>
        )}
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSelected} />
      <OrderDetailDialog orderId={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
