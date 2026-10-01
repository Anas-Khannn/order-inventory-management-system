import { and, asc, count, desc, eq, gt, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client";
import { products } from "../../db/schema";
import { LOW_STOCK_THRESHOLD, type ListProductsQuery, type ProductInput, type ProductSort, type ProductStatus } from "@repo/shared";

export type ProductRow = typeof products.$inferSelect;

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/** Whitelisted sort columns (the query schema only allows these keys). */
const sortColumns = {
  name: products.name,
  sku: products.sku,
  price: products.price,
  stockQuantity: products.stockQuantity,
  status: products.status,
  createdAt: products.createdAt,
} satisfies Record<ProductSort, unknown>;

/** Repository = data access only. No business rules here. */
export const productRepository = {
  async list({ search, status, stock, sort, dir, page, pageSize }: ListProductsQuery) {
    const filters: SQL[] = [];
    if (search) {
      const p = `%${escapeLike(search)}%`;
      filters.push(or(ilike(products.name, p), ilike(products.sku, p))!);
    }
    if (status) filters.push(eq(products.status, status));
    if (stock === "OUT") filters.push(eq(products.stockQuantity, 0));
    if (stock === "LOW") filters.push(and(gt(products.stockQuantity, 0), lte(products.stockQuantity, LOW_STOCK_THRESHOLD))!);
    if (stock === "IN_STOCK") filters.push(gt(products.stockQuantity, LOW_STOCK_THRESHOLD));
    const order = dir === "asc" ? asc : desc;
    const where = filters.length ? and(...filters) : undefined;

    const [rows, totals] = await Promise.all([
      db.select().from(products).where(where).orderBy(order(sortColumns[sort]), order(products.id)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ total: count() }).from(products).where(where),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  },

  listActive: () => db.select().from(products).where(eq(products.status, "ACTIVE")).orderBy(products.name),

  async findById(id: number) {
    const [row] = await db.select().from(products).where(eq(products.id, id));
    return row;
  },

  async insert(input: ProductInput) {
    const [row] = await db
      .insert(products)
      .values({ ...input, price: input.price.toFixed(2) })
      .returning();
    return row!;
  },

  async update(id: number, input: ProductInput) {
    const [row] = await db
      .update(products)
      .set({ ...input, price: input.price.toFixed(2), updatedAt: sql`now()` })
      .where(eq(products.id, id))
      .returning();
    return row;
  },

  async setStatus(id: number, status: ProductStatus) {
    const [row] = await db.update(products).set({ status, updatedAt: sql`now()` }).where(eq(products.id, id)).returning();
    return row;
  },
};
