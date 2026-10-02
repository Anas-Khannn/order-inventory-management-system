import { Router } from "express";
import { idParamSchema, listProductsQuerySchema, productInputSchema, productStatusSchema } from "@repo/shared";
import { requirePermission } from "../../middleware/auth";
import { productFacade } from "./product.facade";

export const productRoutes = Router();

productRoutes.get("/", async (req, res) => {
  res.json(await productFacade.list(listProductsQuerySchema.parse(req.query)));
});

productRoutes.get("/options", async (_req, res) => {
  res.json({ data: await productFacade.listActiveOptions() });
});

productRoutes.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await productFacade.get(id) });
});

productRoutes.post("/", requirePermission("products:write"), async (req, res) => {
  const data = await productFacade.create(productInputSchema.parse(req.body));
  res.status(201).json({ data });
});

productRoutes.put("/:id", requirePermission("products:write"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ data: await productFacade.update(id, productInputSchema.parse(req.body)) });
});

productRoutes.patch("/:id/status", requirePermission("products:write"), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { status } = productStatusSchema.parse(req.body);
  res.json({ data: await productFacade.setStatus(id, status) });
});
