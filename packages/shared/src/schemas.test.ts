import { describe, expect, it } from "vitest";
import { createOrderSchema, productInputSchema } from "./schemas";

describe("shared schemas", () => {
  it("rejects >2 decimal places and negative stock", () => {
    expect(productInputSchema.safeParse({ name: "A", sku: "A1", price: 10.123, stockQuantity: 1 }).success).toBe(false);
    expect(productInputSchema.safeParse({ name: "A", sku: "A1", price: 10, stockQuantity: -1 }).success).toBe(false);
  });
  it("rejects duplicate product ids and bad quantities", () => {
    const base = { customerName: "Ali", customerEmail: "ali@example.com" };
    expect(createOrderSchema.safeParse({ ...base, items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [{ productId: 1, quantity: 0 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [{ productId: 1, quantity: 2 }] }).success).toBe(true);
  });
});
