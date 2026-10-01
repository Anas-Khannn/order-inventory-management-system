import type { CreateOrderInput, ListOrdersQuery, OrderDto, Paginated } from "@repo/shared";
import { http } from "@/lib/http";
import { qs } from "./qs";

export type OrderListParams = Partial<ListOrdersQuery>;

export const ordersFacade = {
  list: (params: OrderListParams) => http<Paginated<OrderDto>>(`/orders?${qs(params)}`),
  get: async (id: number) => (await http<{ data: OrderDto }>(`/orders/${id}`)).data,
  create: async (input: CreateOrderInput) =>
    (await http<{ data: OrderDto }>("/orders", { method: "POST", body: JSON.stringify(input) })).data,
  cancel: async (id: number) => (await http<{ data: OrderDto }>(`/orders/${id}/cancel`, { method: "POST" })).data,
};
