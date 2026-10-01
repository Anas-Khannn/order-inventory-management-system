import { z } from "zod";

export const PRODUCT_STATUS = ["ACTIVE", "INACTIVE"] as const;
export const ORDER_STATUS = ["CREATED", "CANCELLED"] as const;
export const PAGE_SIZE = 10;
/** Active products at or below this many units count as "low stock". */
export const LOW_STOCK_THRESHOLD = 5;

export const SORT_DIR = ["asc", "desc"] as const;
export const PRODUCT_SORT = ["name", "sku", "price", "stockQuantity", "status", "createdAt"] as const;
export const PRODUCT_STOCK_FILTER = ["IN_STOCK", "LOW", "OUT"] as const;
export const ORDER_SORT = ["reference", "customerName", "totalAmount", "status", "createdAt"] as const;

/** Max 2 decimal places, >= 0 (PKR). */
const money = z
  .number({ required_error: "Price is required", invalid_type_error: "Price must be a number" })
  .min(0, "Price cannot be negative")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Max 2 decimal places");

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  sku: z.string().trim().min(1, "SKU is required").max(50),
  price: money,
  stockQuantity: z
    .number({ required_error: "Stock is required", invalid_type_error: "Stock must be a number" })
    .int("Stock must be a whole number")
    .min(0, "Stock cannot be negative"),
  status: z.enum(PRODUCT_STATUS).default("ACTIVE"),
});

export const productStatusSchema = z.object({ status: z.enum(PRODUCT_STATUS) });

export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional().transform((v) => v || undefined),
  status: z.enum(PRODUCT_STATUS).optional(),
  stock: z.enum(PRODUCT_STOCK_FILTER).optional(),
  sort: z.enum(PRODUCT_SORT).default("createdAt"),
  dir: z.enum(SORT_DIR).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
});

export const listOrdersQuerySchema = z.object({
  search: z.string().trim().optional().transform((v) => v || undefined),
  status: z.enum(ORDER_STATUS).optional(),
  sort: z.enum(ORDER_SORT).default("createdAt"),
  dir: z.enum(SORT_DIR).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
});

export const orderItemInputSchema = z.object({
  productId: z.number({ required_error: "Select a product", invalid_type_error: "Select a product" }).int().positive("Select a product"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(150),
  customerEmail: z.string().trim().email("Enter a valid email").max(254),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Add at least one product")
    .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, {
      message: "Each product can only appear once per order",
    }),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type ProductInput = z.infer<typeof productInputSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];
export type OrderStatus = (typeof ORDER_STATUS)[number];
export type SortDir = (typeof SORT_DIR)[number];
export type ProductSort = (typeof PRODUCT_SORT)[number];
export type ProductStockFilter = (typeof PRODUCT_STOCK_FILTER)[number];
export type OrderSort = (typeof ORDER_SORT)[number];
