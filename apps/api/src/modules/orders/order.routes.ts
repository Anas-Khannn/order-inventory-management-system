import { Router } from "express";
import { createOrderSchema, idParamSchema, listOrdersQuerySchema } from "@repo/shared";
import { orderFacade } from "./order.facade";

export const orderRoutes = Router();

orderRoutes.get("/", async (req, res) => {
  res.json(await orderFacade.list(listOrdersQuerySchema.parse(req.query)));
});

orderRoutes.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await orderFacade.get(id) });
});

orderRoutes.post("/", async (req, res) => {
  const data = await orderFacade.create(createOrderSchema.parse(req.body));
  res.status(201).json({ data });
});

orderRoutes.post("/:id/cancel", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await orderFacade.cancel(id) });
});
