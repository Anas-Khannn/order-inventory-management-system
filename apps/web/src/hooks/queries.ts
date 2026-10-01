import { LOW_STOCK_THRESHOLD, type OrderDto, type Paginated, type ProductDto, type ProductInput, type ProductStatus } from "@repo/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "@/facades";

export const keys = {
  products: ["products"] as const,
  productList: (p: object) => ["products", "list", p] as const,
  productOptions: ["products", "options"] as const,
  orders: ["orders"] as const,
  orderList: (p: object) => ["orders", "list", p] as const,
  order: (id: number) => ["orders", "detail", id] as const,
};

/* ---------- optimistic-update helpers ---------- */

type Snapshot = [QueryKey, unknown][];

/** Cancel in-flight fetches under `root` and remember every cached value so we can roll back. */
async function snapshot(qc: QueryClient, root: QueryKey): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: root });
  return qc.getQueriesData({ queryKey: root });
}
const restore = (qc: QueryClient, snap: Snapshot | undefined) => snap?.forEach(([key, data]) => qc.setQueryData(key, data));

const isPage = <T,>(v: unknown): v is Paginated<T> => !!v && typeof v === "object" && Array.isArray((v as Paginated<T>).data);

/** Apply `fn` to an entity wherever it is cached: paginated lists, plain arrays or single-item detail queries. */
function patchEverywhere<T extends { id: number }>(qc: QueryClient, root: QueryKey, match: (t: T) => boolean, fn: (t: T) => T) {
  qc.setQueriesData({ queryKey: root }, (old: unknown) => {
    if (isPage<T>(old)) return { ...old, data: old.data.map((t) => (match(t) ? fn(t) : t)) };
    if (Array.isArray(old)) return (old as T[]).map((t) => (match(t) ? fn(t) : t));
    if (old && typeof old === "object" && "id" in old && match(old as T)) return fn(old as T);
    return old;
  });
}

const findCached = <T extends { id: number }>(qc: QueryClient, root: QueryKey, id: number): T | undefined => {
  for (const [, data] of qc.getQueriesData({ queryKey: root })) {
    const hit = isPage<T>(data) ? data.data.find((t) => t.id === id) : data && (data as T).id === id ? (data as T) : undefined;
    if (hit) return hit;
  }
};

/* ---------- products ---------- */

export const useProducts = (params: Parameters<typeof api.products.list>[0]) =>
  useQuery({ queryKey: keys.productList(params), queryFn: () => api.products.list(params), placeholderData: keepPreviousData });

export const useProductOptions = (enabled = true) =>
  useQuery({ queryKey: keys.productOptions, queryFn: api.products.options, enabled });

/** Edits are applied to the cache instantly; creates wait for the server (it assigns the id). */
export const useSaveProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ProductInput }) => (id ? api.products.update(id, input) : api.products.create(input)),
    onMutate: async ({ id, input }) => {
      if (!id) return;
      const snap = await snapshot(qc, keys.products);
      patchEverywhere<ProductDto>(qc, keys.products, (p) => p.id === id, (p) => ({ ...p, ...input, updatedAt: new Date().toISOString() }));
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.products }),
  });
};

export const useSetProductStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ProductStatus }) => api.products.setStatus(id, status),
    onMutate: async ({ id, status }) => {
      const snap = await snapshot(qc, keys.products);
      patchEverywhere<ProductDto>(qc, keys.products, (p) => p.id === id, (p) => ({ ...p, status, updatedAt: new Date().toISOString() }));
      return { snap };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.products }),
  });
};

/* ---------- orders ---------- */

export const useOrders = (params: Parameters<typeof api.orders.list>[0]) =>
  useQuery({ queryKey: keys.orderList(params), queryFn: () => api.orders.list(params), placeholderData: keepPreviousData });

export const useOrder = (id: number | null) =>
  useQuery({ queryKey: keys.order(id ?? 0), queryFn: () => api.orders.get(id!), enabled: id !== null });

/** Creating/cancelling an order changes stock, so refresh both orders and products. */
const useRefreshAfterOrderChange = () => {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: keys.orders }), qc.invalidateQueries({ queryKey: keys.products })]);
};

export const useCreateOrder = () => {
  const refresh = useRefreshAfterOrderChange();
  return useMutation({ mutationFn: api.orders.create, onSettled: refresh });
};

/** Optimistically flips the order to CANCELLED and puts its quantities back on the shelf. */
export const useCancelOrder = () => {
  const qc = useQueryClient();
  const refresh = useRefreshAfterOrderChange();
  return useMutation({
    mutationFn: api.orders.cancel,
    onMutate: async (id: number) => {
      const [orderSnap, productSnap] = await Promise.all([snapshot(qc, keys.orders), snapshot(qc, keys.products)]);
      const order = findCached<OrderDto>(qc, keys.orders, id);
      patchEverywhere<OrderDto>(qc, keys.orders, (o) => o.id === id, (o) => ({ ...o, status: "CANCELLED", cancelledAt: new Date().toISOString() }));
      order?.items.forEach((item) =>
        patchEverywhere<ProductDto>(qc, keys.products, (p) => p.id === item.productId, (p) => ({ ...p, stockQuantity: p.stockQuantity + item.quantity })),
      );
      return { snap: [...orderSnap, ...productSnap] };
    },
    onError: (_e, _v, ctx) => restore(qc, ctx?.snap),
    onSettled: refresh,
  });
};

/* ---------- dashboard ---------- */

const productSnapshot = { queryKey: [...keys.products, "dashboard"], queryFn: () => api.products.list({ page: 1, pageSize: 100 }) };

/** Active products at or below the low-stock line (shares the dashboard's cached snapshot). */
export const useRestockCount = () => {
  const { data } = useQuery({
    ...productSnapshot,
    select: (d) => d.data.filter((p) => p.status === "ACTIVE" && p.stockQuantity <= LOW_STOCK_THRESHOLD).length,
  });
  return data;
};

/** Dashboard snapshot: up to 100 most recent orders + 100 products (API max page size). */
export const useDashboardData = () => {
  const products = useQuery(productSnapshot);
  const orders = useQuery({ queryKey: [...keys.orders, "dashboard"], queryFn: () => api.orders.list({ page: 1, pageSize: 100 }) });
  return {
    products: products.data?.data,
    productTotal: products.data?.meta.total,
    orders: orders.data?.data,
    orderTotal: orders.data?.meta.total,
    isLoading: products.isLoading || orders.isLoading,
    isFetching: products.isFetching || orders.isFetching,
    error: products.error ?? orders.error,
    refetch: () => Promise.all([products.refetch(), orders.refetch()]),
  };
};
