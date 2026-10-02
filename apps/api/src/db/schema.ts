import { relations, sql } from "drizzle-orm";
import { check, index, integer, numeric, pgEnum, pgTable, serial, timestamp, unique, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { ORDER_STATUS, PRODUCT_STATUS, USER_ROLE } from "@repo/shared";

export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUS);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUS);
export const userRoleEnum = pgEnum("user_role", USER_ROLE);

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

/** Emails are stored lower-cased; the unique index on lower(email) also guards rows written outside the API. */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("STAFF"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_users_email").on(sql`lower(${t.email})`), check("chk_users_name", sql`btrim(${t.name}) <> ''`)],
);

/** Opaque bearer sessions. Only a SHA-256 of the token is stored, so a DB leak cannot be replayed. */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_sessions_token_hash").on(t.tokenHash), index("idx_sessions_user_id").on(t.userId)],
);

/** Single-use reset links. `usedAt` is set when consumed, so a link cannot be replayed. */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_password_resets_token_hash").on(t.tokenHash), index("idx_password_resets_user_id").on(t.userId)],
);

export const usersRelations = relations(users, ({ many }) => ({ sessions: many(sessions) }));
export const sessionsRelations = relations(sessions, ({ one }) => ({ user: one(users, { fields: [sessions.userId], references: [users.id] }) }));
