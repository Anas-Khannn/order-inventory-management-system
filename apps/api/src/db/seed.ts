import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { DEMO_PASSWORD, seedDemoUsers } from "./demo-users";
import { products } from "./schema";

const rows: (typeof products.$inferInsert)[] = [
  { name: "Product A", sku: "PRD-A", price: "1000.00", stockQuantity: 5 }, // spec example
  { name: "Product B", sku: "PRD-B", price: "500.00", stockQuantity: 3 }, // spec example
  { name: "Wireless Mouse", sku: "ELC-001", price: "1850.00", stockQuantity: 40 },
  { name: "Mechanical Keyboard", sku: "ELC-002", price: "7500.50", stockQuantity: 15 },
  { name: "USB-C Cable 1m", sku: "ELC-003", price: "450.00", stockQuantity: 120 },
  { name: "27\" Monitor", sku: "ELC-004", price: "42999.00", stockQuantity: 6 },
  { name: "Laptop Stand", sku: "ACC-001", price: "2200.00", stockQuantity: 25 },
  { name: "Notebook A5", sku: "STN-001", price: "250.00", stockQuantity: 200 },
  { name: "Gel Pen (Box of 10)", sku: "STN-002", price: "320.75", stockQuantity: 80 },
  { name: "Desk Lamp", sku: "HOM-001", price: "3100.00", stockQuantity: 12 },
  { name: "Out of Stock Headphones", sku: "ELC-005", price: "5600.00", stockQuantity: 0 }, // zero stock
  { name: "Discontinued Webcam", sku: "ELC-006", price: "4800.00", stockQuantity: 9, status: "INACTIVE" }, // inactive
  { name: "Phone Holder", sku: "ACC-002", price: "650.00", stockQuantity: 60 },
  { name: "Power Strip 4-way", sku: "HOM-002", price: "1400.00", stockQuantity: 33 },
];

async function main() {
  await db.execute(sql`TRUNCATE TABLE order_items, orders, products, password_resets, sessions, users RESTART IDENTITY CASCADE`);
  await db.insert(products).values(rows);
  console.log(`Seeded ${rows.length} products`);

  console.log(`Seeded ${await seedDemoUsers()} users (password: ${DEMO_PASSWORD})`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
