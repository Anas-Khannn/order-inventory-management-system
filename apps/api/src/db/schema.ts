import { relations, sql } from "drizzle-orm";
import { check, index, integer, numeric, pgEnum, pgTable, serial, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { ORDER_STATUS, PRODUCT_STATUS } from "@repo/shared";

export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUS);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    sku: varchar("sku", { length: 50 }).notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    status: productStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_products_sku").on(t.sku),
    check("chk_products_name", sql`btrim(${t.name}) <> ''`),
    check("chk_products_sku", sql`btrim(${t.sku}) <> ''`),
    check("chk_products_price", sql`${t.price} >= 0`),
    check("chk_products_stock", sql`${t.stockQuantity} >= 0`),
    index("idx_products_status").on(t.status),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    reference: varchar("reference", { length: 30 }).notNull(),
    customerName: varchar("customer_name", { length: 150 }).notNull(),
    customerEmail: varchar("customer_email", { length: 254 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("CREATED"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    unique("uq_orders_reference").on(t.reference),
    check("chk_orders_total", sql`${t.totalAmount} >= 0`),
    index("idx_orders_created_at").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [
    unique("uq_order_product").on(t.orderId, t.productId),
    check("chk_items_qty", sql`${t.quantity} > 0`),
    check("chk_items_price", sql`${t.unitPrice} >= 0`),
    index("idx_order_items_order_id").on(t.orderId),
  ],
);

export const productsRelations = relations(products, ({ many }) => ({ orderItems: many(orderItems) }));
export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
