import { LOW_STOCK_THRESHOLD, type ProductDto, type ProductSort, type ProductStatus, type ProductStockFilter, type SortDir } from "@repo/shared";
import { getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { EmptyState, ErrorState, LoadingRows, RefreshBar } from "@/components/states";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Segmented } from "@/components/ui/segmented";
import { Status } from "@/components/ui/status";
import { useDebounce } from "@/hooks/use-debounce";
import { useFlash } from "@/hooks/use-flash";
import { useHashQuery } from "@/hooks/use-hash-query";
import { useProducts, useSetProductStatus } from "@/hooks/queries";
import { formatDate, formatPKR } from "@/lib/format";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { ProductFormDialog } from "./product-form-dialog";

const DEFAULTS = { q: "", status: "", stock: "", sort: "createdAt", dir: "desc", page: "1" };

function StockCell({ qty, inactive }: { qty: number; inactive: boolean }) {
  if (inactive) return <span className="tabular-nums text-muted-foreground">{qty}</span>;
  if (qty === 0) return <Status tone="danger">Out of stock</Status>;
  if (qty <= LOW_STOCK_THRESHOLD) return <Status tone="warning">{qty} · low</Status>;
  return <span className="tabular-nums">{qty}</span>;
}

export function ProductsPage() {
  const [f, setF] = useHashQuery(DEFAULTS);
  const [search, setSearch] = useState(f.q);
  const [editing, setEditing] = useState<ProductDto | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [flashId, flash] = useFlash();

  // Debounce typing, then commit to the URL (and therefore the query).
  const debounced = useDebounce(search);
  useEffect(() => {
    if (debounced !== f.q) setF({ q: debounced, page: "1" });
  }, [debounced, f.q, setF]);

  const params = {
    search: f.q || undefined,
    status: (f.status || undefined) as ProductStatus | undefined,
    stock: (f.stock || undefined) as ProductStockFilter | undefined,
    sort: f.sort as ProductSort,
    dir: f.dir as SortDir,
    page: Number(f.page) || 1,
    pageSize: 10,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useProducts(params);
  const toggle = useSetProductStatus();

  const columns = useMemo<ColumnDef<ProductDto>[]>(() => {
    const setProductStatus = (p: ProductDto, next: ProductStatus, isUndo = false) => {
      flash(p.id);
      toggle.mutate(
        { id: p.id, status: next },
        {
          onSuccess: () => {
            if (isUndo) return notify.success(`${p.name} restored`);
            notify.undoable(`${p.name} ${next === "ACTIVE" ? "reactivated" : "deactivated"}`, () => setProductStatus(p, p.status, true), next === "INACTIVE" ? "It won't appear in new orders." : undefined);
          },
          onError: (e) => notify.error(e, { title: `Couldn't update ${p.name}. Change reverted.`, retry: () => setProductStatus(p, next, isUndo) }),
        },
      );
    };

    return [
      {
        id: "name",
        accessorKey: "name",
        header: "Product",
        meta: { className: "min-w-48" },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className={cn("truncate font-medium", row.original.status === "INACTIVE" && "text-muted-foreground")}>{row.original.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.sku}</p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (getValue<string>() === "ACTIVE" ? <Status tone="success">Active</Status> : <Status tone="neutral">Inactive</Status>),
      },
      {
        id: "stockQuantity",
        accessorKey: "stockQuantity",
        header: "Stock",
        meta: { align: "right" },
        cell: ({ row }) => <StockCell qty={row.original.stockQuantity} inactive={row.original.status === "INACTIVE"} />,
      },
      { id: "price", accessorKey: "price", header: "Price", meta: { align: "right" }, cell: ({ getValue }) => formatPKR(getValue<number>()) },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Added",
        meta: { align: "right", className: "hidden md:table-cell" },
        cell: ({ getValue }) => <span className="text-muted-foreground">{formatDate(getValue<string>())}</span>,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        meta: { align: "right" },
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="ghost" className="w-[5.75rem]" onClick={() => setProductStatus(p, p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>
                {p.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Edit ${p.name}`}
                title="Edit"
                onClick={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ];
  }, [toggle, flash]);

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
      // Switching column: text starts A→Z, numbers and dates start highest/newest first.
      const desc = next.id !== f.sort ? !["name", "status"].includes(next.id) : next.desc;
      setF({ sort: next.id, dir: desc ? "desc" : "asc", page: "1" });
    },
  });

  const filtered = !!(f.q || f.status || f.stock);
  const clearFilters = () => {
    setSearch("");
    setF({ q: "", status: "", stock: "", page: "1" });
  };

  return (
    <section aria-labelledby="products-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="products-heading" className="text-base font-semibold">
            Catalog
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {data ? `${data.meta.total} product${data.meta.total === 1 ? "" : "s"}${filtered ? " match these filters" : ""}` : "Loading products"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New product
        </Button>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} label="Search products" placeholder="Search by name or SKU" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Filter by status"
            value={f.status}
            onChange={(v) => setF({ status: v, page: "1" })}
            options={[
              { value: "", label: "All" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
          <NativeSelect aria-label="Filter by stock level" className="w-auto min-w-36" value={f.stock} onChange={(e) => setF({ stock: e.target.value, page: "1" })}>
            <option value="">Any stock level</option>
            <option value="IN_STOCK">In stock (over {LOW_STOCK_THRESHOLD})</option>
            <option value="LOW">Low (1 to {LOW_STOCK_THRESHOLD})</option>
            <option value="OUT">Out of stock</option>
          </NativeSelect>
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
              message="No products match these filters"
              hint="Try a different search term, status or stock level."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              message="No products yet"
              hint="Add your first product to start taking orders."
              action={
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> New product
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
                caption="Products with status, stock, price and date added"
                rowClassName={(r) => flashId === r.original.id && "animate-flash"}
              />
            </div>
            {data && <Pagination meta={data.meta} onPage={(p) => setF({ page: String(p) })} disabled={isFetching} />}
          </>
        )}
      </div>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} onSaved={flash} />
    </section>
  );
}
