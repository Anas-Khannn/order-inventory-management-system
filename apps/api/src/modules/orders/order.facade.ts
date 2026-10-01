import { randomBytes } from "node:crypto";
import type { CreateOrderInput, ListOrdersQuery, OrderDto, Paginated } from "@repo/shared";
import { db } from "../../db/client";
import { conflict, notFound, unprocessable } from "../../errors";
import { orderRepository, type NewLine } from "./order.repository";

type OrderRow = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const toOrderDto = (o: OrderRow): OrderDto => ({
  id: o.id,
  reference: o.reference,
  customerName: o.customerName,
  customerEmail: o.customerEmail,
  totalAmount: Number(o.totalAmount),
  status: o.status,
  createdAt: o.createdAt.toISOString(),
  cancelledAt: o.cancelledAt?.toISOString() ?? null,
  items: o.items.map((i) => ({
    id: i.id,
    productId: i.productId,
    productName: i.product.name,
    productSku: i.product.sku,
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    lineTotal: Number(i.lineTotal),
  })),
});

const cents = (v: string | number) => Math.round(Number(v) * 100);
const fromCents = (c: number) => (c / 100).toFixed(2);
const makeReference = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${d}-${randomBytes(3).toString("hex").toUpperCase()}`;
};

/**
 * FACADE for the order workflow. Controllers call create/cancel/get/list only;
 * locking, validation, price snapshots and stock changes stay hidden in here.
 */
export const orderFacade = {
  async list(query: ListOrdersQuery): Promise<Paginated<OrderDto>> {
    const { page, pageSize } = query;
    const { rows, total } = await orderRepository.list(query);
    return {
      data: rows.map(toOrderDto),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    };
  },

  async get(id: number): Promise<OrderDto> {
    const row = await orderRepository.findById(id);
    if (!row) throw notFound("Order");
    return toOrderDto(row);
  },

  /** One transaction: lock products -> validate -> insert order + items -> reduce stock. All or nothing. */
  async create(input: CreateOrderInput): Promise<OrderDto> {
    const orderId = await db.transaction(async (tx) => {
      const locked = await orderRepository.lockProducts(tx, input.items.map((i) => i.productId));
      const byId = new Map(locked.map((p) => [p.id, p]));

      const problems: { productId: number; message: string }[] = [];
      const lines: NewLine[] = [];
      let totalCents = 0;

      for (const item of input.items) {
        const p = byId.get(item.productId);
        if (!p) problems.push({ productId: item.productId, message: "Product not found" });
        else if (p.status !== "ACTIVE") problems.push({ productId: p.id, message: `${p.name} is inactive` });
        else if (item.quantity > p.stockQuantity)
          problems.push({ productId: p.id, message: `Insufficient stock for ${p.name}: requested ${item.quantity}, available ${p.stockQuantity}` });
        else {
          const unit = cents(p.price); // price comes from the DB, never from the client
          totalCents += unit * item.quantity;
          lines.push({ productId: p.id, quantity: item.quantity, unitPrice: fromCents(unit), lineTotal: fromCents(unit * item.quantity) });
        }
      }
      if (problems.length) throw unprocessable("ORDER_REJECTED", "Order could not be created", problems);

      const order = await orderRepository.insertOrder(tx, {
        reference: makeReference(),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        totalAmount: fromCents(totalCents),
      });
      await orderRepository.insertItems(tx, order.id, lines);
      for (const l of lines) {
        const ok = await orderRepository.decrementStock(tx, l.productId, l.quantity);
        if (!ok) throw unprocessable("ORDER_REJECTED", "Stock changed while creating the order", [{ productId: l.productId }]);
      }
      return order.id; // throwing anywhere above rolls everything back
    });
    return orderFacade.get(orderId);
  },

  /** Status flip + stock restore in one transaction. The conditional UPDATE makes a 2nd cancel a no-op. */
  async cancel(id: number): Promise<OrderDto> {
    await db.transaction(async (tx) => {
      const flipped = await orderRepository.markCancelled(tx, id);
      if (flipped.length === 0) {
        if (!(await orderRepository.exists(tx, id))) throw notFound("Order");
        throw conflict("ALREADY_CANCELLED", "Order is already cancelled. No stock was restored.");
      }
      for (const item of await orderRepository.itemsOf(tx, id)) {
        await orderRepository.incrementStock(tx, item.productId, item.quantity);
      }
    });
    return orderFacade.get(id);
  },
};
