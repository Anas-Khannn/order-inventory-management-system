import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { ListOrdersQuery, OrderSort } from "@repo/shared";
import { db, type Tx } from "../../db/client";
import { orderItems, orders, products } from "../../db/schema";
import { escapeLike } from "../products/product.repository";

export interface NewLine {
  productId: number;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

const withItems = { items: { with: { product: true }, orderBy: orderItems.id } } as const;

/** Whitelisted sort columns (the query schema only allows these keys). */
const sortColumns = {
  reference: orders.reference,
  customerName: orders.customerName,
  totalAmount: orders.totalAmount,
  status: orders.status,
  createdAt: orders.createdAt,
} satisfies Record<OrderSort, unknown>;

export const orderRepository = {
  async list({ search, status, sort, dir, page, pageSize }: ListOrdersQuery) {
    const filters: SQL[] = [];
    if (search) {
      const p = `%${escapeLike(search)}%`;
      filters.push(or(ilike(orders.reference, p), ilike(orders.customerName, p), ilike(orders.customerEmail, p))!);
    }
    if (status) filters.push(eq(orders.status, status));
    const where = filters.length ? and(...filters) : undefined;
    const order = dir === "asc" ? asc : desc;
    const [rows, totals] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: withItems,
        orderBy: [order(sortColumns[sort]), order(orders.id)],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      db.select({ total: count() }).from(orders).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  },

  findById: (id: number) => db.query.orders.findFirst({ where: eq(orders.id, id), with: withItems }),

  // ----- transactional helpers (always receive a Tx) -----

  /** SELECT ... FOR UPDATE: concurrent orders for the same product wait here => no overselling. */
  lockProducts: (tx: Tx, ids: number[]) =>
    tx.select().from(products).where(inArray(products.id, ids)).orderBy(products.id).for("update"),

  async insertOrder(tx: Tx, v: { reference: string; customerName: string; customerEmail: string; totalAmount: string }) {
    const [row] = await tx.insert(orders).values(v).returning({ id: orders.id });
    return row!;
  },

  insertItems: (tx: Tx, orderId: number, lines: NewLine[]) =>
    tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId }))),

  /** Guarded decrement: refuses to go below zero even if something upstream is wrong. */
  async decrementStock(tx: Tx, productId: number, qty: number) {
    const res = await tx
      .update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} - ${qty}`, updatedAt: sql`now()` })
      .where(and(eq(products.id, productId), sql`${products.stockQuantity} >= ${qty}`))
      .returning({ id: products.id });
    return res.length === 1;
  },

  incrementStock: (tx: Tx, productId: number, qty: number) =>
    tx
      .update(products)
      .set({ stockQuantity: sql`${products.stockQuantity} + ${qty}`, updatedAt: sql`now()` })
      .where(eq(products.id, productId)),

  /** Atomic status flip. Returns [] if the order is missing or already cancelled. */
  markCancelled: (tx: Tx, id: number) =>
    tx
      .update(orders)
      .set({ status: "CANCELLED", cancelledAt: sql`now()` })
      .where(and(eq(orders.id, id), eq(orders.status, "CREATED")))
      .returning({ id: orders.id }),

  itemsOf: (tx: Tx, orderId: number) => tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(orderItems.productId),

  exists: async (tx: Tx, id: number) => (await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, id))).length > 0,
};
