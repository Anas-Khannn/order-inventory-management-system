import type { ListProductsQuery, Paginated, ProductDto, ProductInput, ProductStatus } from "@repo/shared";
import { http } from "@/lib/http";
import { qs } from "./qs";

export type ProductListParams = Partial<ListProductsQuery>;

/** FACADE: UI code never touches fetch/URLs/response shapes directly. */
export const productsFacade = {
  list: (params: ProductListParams) => http<Paginated<ProductDto>>(`/products?${qs(params)}`),
  options: async () => (await http<{ data: ProductDto[] }>("/products/options")).data,
  create: async (input: ProductInput) =>
    (await http<{ data: ProductDto }>("/products", { method: "POST", body: JSON.stringify(input) })).data,
  update: async (id: number, input: ProductInput) =>
    (await http<{ data: ProductDto }>(`/products/${id}`, { method: "PUT", body: JSON.stringify(input) })).data,
  setStatus: async (id: number, status: ProductStatus) =>
    (await http<{ data: ProductDto }>(`/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })).data,
};
