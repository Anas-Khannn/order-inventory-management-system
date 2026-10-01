import { LOW_STOCK_THRESHOLD, type OrderDto, type ProductDto } from "@repo/shared";

export { LOW_STOCK_THRESHOLD };
const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Last `n` calendar days ending today, oldest first. */
const lastDays = (n: number) => {
  const today = startOfDay(new Date()).getTime();
  return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i) * DAY));
};

const inWindow = (iso: string, fromDaysAgo: number, toDaysAgo: number) => {
  const today = startOfDay(new Date()).getTime() + DAY;
  const t = new Date(iso).getTime();
  return t >= today - fromDaysAgo * DAY && t < today - toDaysAgo * DAY;
};

const isLive = (o: OrderDto) => o.status === "CREATED";
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildKpis(orders: OrderDto[], products: ProductDto[]) {
  const thisWeek = orders.filter((o) => inWindow(o.createdAt, 7, 0));
  const lastWeek = orders.filter((o) => inWindow(o.createdAt, 14, 7));
  const revenue = (os: OrderDto[]) => sum(os.filter(isLive).map((o) => o.totalAmount));
  const aov = (os: OrderDto[]) => {
    const live = os.filter(isLive);
    return live.length ? revenue(live) / live.length : 0;
  };
  const active = products.filter((p) => p.status === "ACTIVE");
  return {
    revenue: { now: revenue(thisWeek), prev: revenue(lastWeek) },
    orders: { now: thisWeek.filter(isLive).length, prev: lastWeek.filter(isLive).length },
    aov: { now: aov(thisWeek), prev: aov(lastWeek) },
    inventoryValue: sum(active.map((p) => p.price * p.stockQuantity)),
    unitsInStock: sum(active.map((p) => p.stockQuantity)),
    activeProducts: active.length,
  };
}

/** Daily revenue (non-cancelled orders), last 7 days. */
export function dailyRevenue(orders: OrderDto[]) {
  return lastDays(7).map((d) => {
    const key = dayKey(d);
    const revenue = sum(orders.filter((o) => isLive(o) && dayKey(new Date(o.createdAt)) === key).map((o) => o.totalAmount));
    return { date: key, day: d.toLocaleDateString("en-US", { weekday: "short" }), revenue };
  });
}

/** Daily order count split by outcome, last 14 days. */
export function dailyOrders(orders: OrderDto[]) {
  return lastDays(14).map((d) => {
    const key = dayKey(d);
    const day = orders.filter((o) => dayKey(new Date(o.createdAt)) === key);
    return {
      date: key,
      label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      fulfilled: day.filter(isLive).length,
      cancelled: day.length - day.filter(isLive).length,
    };
  });
}

export function stockAlerts(products: ProductDto[]) {
  return products
    .filter((p) => p.status === "ACTIVE" && p.stockQuantity <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.stockQuantity - b.stockQuantity);
}

export type ActivityKind = "order" | "cancel" | "product";
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  at: string;
}

export function recentActivity(orders: OrderDto[], products: ProductDto[], limit = 6): ActivityItem[] {
  const items: ActivityItem[] = [
    ...orders.map((o) => ({ id: `o${o.id}`, kind: "order" as const, title: `${o.reference} placed by ${o.customerName}`, at: o.createdAt })),
    ...orders
      .filter((o) => o.cancelledAt)
      .map((o) => ({ id: `c${o.id}`, kind: "cancel" as const, title: `${o.reference} was cancelled`, at: o.cancelledAt! })),
    ...products.map((p) => ({
      id: `p${p.id}`,
      kind: "product" as const,
      title: p.createdAt === p.updatedAt ? `${p.name} added to catalog` : `${p.name} updated`,
      at: p.updatedAt,
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string) {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, s] of steps) if (Math.abs(secs) >= s) return rtf.format(Math.round(secs / s), unit);
  return "just now";
}
