import { ArrowRight, Ban, PackagePlus, PackageX, Pencil, RefreshCw, ShoppingCart, TriangleAlert, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";
import { Delta, pctChange } from "@/components/delta";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Status } from "@/components/ui/status";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateOrderDialog } from "@/features/orders/create-order-dialog";
import { OrderDetailDialog, OrderStatusBadge } from "@/features/orders/order-detail-dialog";
import { ProductFormDialog } from "@/features/products/product-form-dialog";
import { useDashboardData } from "@/hooks/queries";
import { useCountUp } from "@/hooks/use-count-up";
import { useShortcut } from "@/hooks/use-shortcut";
import { formatPKR, formatPKRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD, buildKpis, dailyOrders, dailyRevenue, recentActivity, stockAlerts, timeAgo, type ActivityKind } from "./metrics";

/**
 * Layout adapted from Efferd "Dashboard 2" (free block): a hairline-bordered grid of
 * KPI tiles, two charts, a recent table, a stock list and an activity feed.
 * Styled with restraint: monochrome data, colour only for state, direct labels over legends.
 */

type Page = "products" | "orders";
type Navigate = (page: Page, query?: Record<string, string>) => void;

/* ---------- building blocks ---------- */

function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("flex min-w-0 flex-col bg-background", className)}>{children}</section>;
}

function TileHeader({ title, description, extra }: { title: ReactNode; description?: string; extra?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
      <div className="min-w-0 space-y-1">
        <h2 className="text-sm font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {extra}
    </header>
  );
}

function TileLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="-mr-2 shrink-0 text-muted-foreground hover:text-foreground" onClick={onClick}>
      {children} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
    </Button>
  );
}

function StatTile({ label, value, format, delta, foot }: { label: string; value: number; format: (n: number) => string; delta?: number | null; foot: ReactNode }) {
  const shown = useCountUp(value);
  return (
    <Tile className="gap-2 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums" aria-label={format(value)}>
        {format(shown)}
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        {delta !== undefined && delta !== null && <Delta value={delta} />}
        {delta === null ? "No orders in the 7 days before" : foot}
      </p>
    </Tile>
  );
}

function EmptyBlock({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-1 px-5 py-8">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action && <div className="-ml-2 mt-2">{action}</div>}
    </div>
  );
}

/* ---------- quick actions ---------- */

interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  onClick: () => void;
  shortcut?: string;
  /** Shows a count; zero dims the action but keeps it usable. */
  count?: number;
  tone?: "warning" | "danger";
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section aria-labelledby="quick-actions-heading" className="mb-6">
      <h2 id="quick-actions-heading" className="sr-only">
        Quick actions
      </h2>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {actions.map(({ label, hint, icon: Icon, onClick, shortcut, count, tone }) => {
          const empty = count === 0;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={onClick}
                aria-keyshortcuts={shortcut}
                className={cn(
                  "group/qa flex h-full w-full items-start gap-3 rounded-lg border bg-background p-3.5 text-left transition-[background-color,border-color,transform] duration-150 ease-out hover:border-foreground/20 hover:bg-muted/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:p-4",
                  empty && "text-muted-foreground",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    !empty && tone === "warning" && "text-amber-600 dark:text-amber-400",
                    !empty && tone === "danger" && "text-rose-600 dark:text-rose-400",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 text-sm font-medium">
                    {label}
                    {count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
                </span>
                {shortcut ? (
                  <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-[11px] uppercase text-muted-foreground sm:block">{shortcut}</kbd>
                ) : (
                  <ArrowRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/qa:translate-x-0.5" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- sections ---------- */

const revenueConfig = { revenue: { label: "Revenue", color: "hsl(var(--foreground))" } } satisfies ChartConfig;

function RevenueChart({ data, growth }: { data: ReturnType<typeof dailyRevenue>; growth: number | null }) {
  const total = data.reduce((a, d) => a + d.revenue, 0);
  const best = data.reduce((a, d) => (d.revenue > a.revenue ? d : a), data[0]!);
  return (
    <Tile className="md:col-span-2">
      <TileHeader
        title="Revenue, last 7 days"
        description="Non-cancelled orders, by day placed."
        extra={
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{formatPKRCompact(total)}</p>
            {growth !== null && (
              <p className="text-xs text-muted-foreground">
                <Delta value={growth} /> vs week before
              </p>
            )}
          </div>
        }
      />
      <figure className="px-3 pb-4">
        <ChartContainer config={revenueConfig} className="h-60 md:h-64" role="img" aria-label={`Daily revenue for the last 7 days, total ${formatPKR(total)}`}>
          <BarChart data={data} margin={{ left: 8, right: 8, top: 24 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} />
            <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} content={<ChartTooltipContent valueFormatter={(v) => formatPKR(Number(v))} />} />
            <Bar dataKey="revenue" fill="var(--color-revenue)" fillOpacity={0.88} radius={[3, 3, 0, 0]} maxBarSize={48}>
              <LabelList
                dataKey="revenue"
                position="top"
                offset={8}
                className="fill-muted-foreground text-[11px] tabular-nums"
                formatter={(v: number) => (v > 0 ? formatPKRCompact(v) : "")}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
        <figcaption className="mt-3 px-2 text-sm text-muted-foreground">
          {total > 0 ? `${best.day} was the strongest day at ${formatPKR(best.revenue)}.` : "No revenue recorded this week."}
        </figcaption>
      </figure>
    </Tile>
  );
}

const ordersConfig = {
  fulfilled: { label: "Placed", color: "hsl(var(--foreground))" },
  cancelled: { label: "Cancelled", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

function OrdersChart({ data }: { data: ReturnType<typeof dailyOrders> }) {
  const placed = data.reduce((a, d) => a + d.fulfilled, 0);
  const cancelled = data.reduce((a, d) => a + d.cancelled, 0);
  const rate = placed + cancelled ? (cancelled / (placed + cancelled)) * 100 : 0;
  return (
    <Tile className="md:col-span-2">
      <TileHeader
        title="Orders per day, last 14 days"
        description={`${placed} placed and ${cancelled} cancelled. ${rate.toFixed(1)}% of orders were cancelled.`}
        extra={
          // Line-style key (solid vs dashed) so the series differ by more than colour.
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <svg width="16" height="2" aria-hidden>
                <line x1="0" y1="1" x2="16" y2="1" stroke="hsl(var(--foreground))" strokeWidth="2" />
              </svg>
              Placed
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="2" aria-hidden>
                <line x1="0" y1="1" x2="16" y2="1" stroke="hsl(var(--chart-5))" strokeWidth="2" strokeDasharray="3 3" />
              </svg>
              Cancelled
            </span>
          </div>
        }
      />
      <div className="px-3 pb-4">
        <ChartContainer config={ordersConfig} className="h-60 md:h-64" role="img" aria-label={`Orders per day: ${placed} placed, ${cancelled} cancelled in the last 14 days`}>
          <LineChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} minTickGap={20} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
            <ChartTooltip cursor={{ stroke: "hsl(var(--border))" }} content={<ChartTooltipContent />} />
            <Line dataKey="fulfilled" type="monotone" stroke="var(--color-fulfilled)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line dataKey="cancelled" type="monotone" stroke="var(--color-cancelled)" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      </div>
    </Tile>
  );
}

function RecentOrders({ orders, onOpen, onViewAll }: { orders: ReturnType<typeof useDashboardData>["orders"]; onOpen: (id: number) => void; onViewAll: () => void }) {
  const rows = (orders ?? []).slice(0, 6);
  return (
    <Tile className="md:col-span-2">
      <TileHeader title="Recent orders" description="Select an order to see its items." extra={<TileLink onClick={onViewAll}>All orders</TileLink>} />
      {rows.length === 0 ? (
        <EmptyBlock title="No orders yet" description="Orders you create will show up here." />
      ) : (
        <div className="px-5 pb-3">
          <Table className="[&_tr>*:first-child]:pl-0 [&_tr>*:last-child]:pr-0">
            <TableCaption className="sr-only">Six most recent orders</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead data-align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow
                  key={o.id}
                  tabIndex={0}
                  aria-label={`Open order ${o.reference}`}
                  className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                  onClick={() => onOpen(o.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(o.id))}
                >
                  <TableCell className="max-w-44 truncate font-medium">{o.customerName}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{o.reference}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell data-align="right" className={cn(o.status === "CANCELLED" && "text-muted-foreground line-through")}>
                    {formatPKR(o.totalAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Tile>
  );
}

function StockHealth({ alerts, onManage }: { alerts: ReturnType<typeof stockAlerts>; onManage: () => void }) {
  const out = alerts.filter((p) => p.stockQuantity === 0).length;
  return (
    <Tile>
      <TileHeader
        title="Needs restocking"
        description={alerts.length ? `${out} out of stock, ${alerts.length - out} at ${LOW_STOCK_THRESHOLD} units or fewer.` : "Every active product is above the low-stock line."}
      />
      {alerts.length === 0 ? (
        <EmptyBlock title="Nothing to restock" description={`Products are flagged here at ${LOW_STOCK_THRESHOLD} units or fewer.`} action={<TileLink onClick={onManage}>Review inventory</TileLink>} />
      ) : (
        <>
          <ul className="flex-1 px-5">
            {alerts.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-border/70 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                </div>
                {p.stockQuantity === 0 ? <Status tone="danger">Out</Status> : <Status tone="warning">{p.stockQuantity} left</Status>}
              </li>
            ))}
          </ul>
          <div className="px-5 pb-4 pt-1">
            <TileLink onClick={onManage}>{alerts.length > 5 ? `See all ${alerts.length}` : "Manage products"}</TileLink>
          </div>
        </>
      )}
    </Tile>
  );
}

const activityIcon: Record<ActivityKind, ReactNode> = {
  order: <ShoppingCart className="h-4 w-4" aria-hidden />,
  cancel: <Ban className="h-4 w-4" aria-hidden />,
  product: <Pencil className="h-4 w-4" aria-hidden />,
};

function Activity({ items }: { items: ReturnType<typeof recentActivity> }) {
  return (
    <Tile>
      <TileHeader title="Activity" description="Latest changes to orders and products." />
      {items.length === 0 ? (
        <EmptyBlock title="Nothing yet" description="Activity appears as you add products and take orders." />
      ) : (
        <ol className="px-5 pb-3">
          {items.map((a) => (
            <li key={a.id} className="flex items-baseline gap-3 border-b border-border/70 py-3 last:border-0">
              <span className="translate-y-0.5 text-muted-foreground">{activityIcon[a.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={a.at}>{timeAgo(a.at)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Tile>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading dashboard">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 bg-background p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-background p-5 md:col-span-2">
          <Skeleton className="h-72 w-full" />
        </div>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export function DashboardPage({ onNavigate }: { onNavigate: Navigate }) {
  const { orders, products, productTotal, orderTotal, isLoading, isFetching, error, refetch } = useDashboardData();
  const [selected, setSelected] = useState<number | null>(null);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  useShortcut("o", () => setOrderFormOpen(true));
  useShortcut("p", () => setProductFormOpen(true));

  const view = useMemo(() => {
    if (!orders || !products) return null;
    return {
      kpis: buildKpis(orders, products),
      revenue: dailyRevenue(orders),
      volume: dailyOrders(orders),
      alerts: stockAlerts(products),
      activity: recentActivity(orders, products),
    };
  }, [orders, products]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !view) return <ErrorState message={error?.message ?? "Could not load dashboard"} onRetry={() => refetch()} />;

  const { kpis } = view;
  const outCount = view.alerts.filter((p) => p.stockQuantity === 0).length;
  const lowCount = view.alerts.length - outCount;
  const quickActions: QuickAction[] = [
    { label: "New order", hint: "Reserve stock for a customer", icon: ShoppingCart, shortcut: "o", onClick: () => setOrderFormOpen(true) },
    { label: "Add product", hint: "Create a new catalog item", icon: PackagePlus, shortcut: "p", onClick: () => setProductFormOpen(true) },
    {
      label: "Low stock",
      hint: `Active items with 1 to ${LOW_STOCK_THRESHOLD} units`,
      icon: TriangleAlert,
      count: lowCount,
      tone: "warning",
      onClick: () => onNavigate("products", { stock: "LOW", status: "ACTIVE", sort: "stockQuantity", dir: "asc" }),
    },
    {
      label: "Out of stock",
      hint: "Active items with none left",
      icon: PackageX,
      count: outCount,
      tone: "danger",
      onClick: () => onNavigate("products", { stock: "OUT", status: "ACTIVE" }),
    },
  ];
  const sampled = orderTotal !== undefined && orders && orderTotal > orders.length;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isFetching ? "Refreshing…" : sampled ? `Based on your latest ${orders.length} of ${orderTotal} orders.` : `Based on all ${orders?.length ?? 0} order${orders?.length === 1 ? "" : "s"}.`}
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh
        </Button>
      </div>
      <QuickActions actions={quickActions} />
      <div className="stagger grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Revenue, 7 days" value={kpis.revenue.now} format={formatPKRCompact} delta={pctChange(kpis.revenue.prev, kpis.revenue.now)} foot="vs the 7 days before" />
        <StatTile label="Orders, 7 days" value={kpis.orders.now} format={(n) => Math.round(n).toLocaleString()} delta={pctChange(kpis.orders.prev, kpis.orders.now)} foot="vs the 7 days before" />
        <StatTile label="Average order" value={kpis.aov.now} format={formatPKRCompact} delta={pctChange(kpis.aov.prev, kpis.aov.now)} foot="vs the 7 days before" />
        <StatTile
          label="Stock on hand, at list price"
          value={kpis.inventoryValue}
          format={formatPKRCompact}
          foot={`${kpis.unitsInStock.toLocaleString()} units across ${kpis.activeProducts} of ${productTotal ?? products?.length} products`}
        />
        <RevenueChart data={view.revenue} growth={pctChange(kpis.revenue.prev, kpis.revenue.now)} />
        <OrdersChart data={view.volume} />
        <RecentOrders orders={orders} onOpen={setSelected} onViewAll={() => onNavigate("orders")} />
        <StockHealth alerts={view.alerts} onManage={() => onNavigate("products")} />
        <Activity items={view.activity} />
      </div>
      <OrderDetailDialog orderId={selected} onClose={() => setSelected(null)} />
      <CreateOrderDialog open={orderFormOpen} onOpenChange={setOrderFormOpen} onCreated={setSelected} />
      <ProductFormDialog open={productFormOpen} onOpenChange={setProductFormOpen} />
    </>
  );
}
