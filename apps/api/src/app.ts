import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { orderRoutes } from "./modules/orders/order.routes";
import { productRoutes } from "./modules/products/product.routes";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});
app.use("/api/auth", authRoutes);
// Everything below needs a signed-in user; write routes also check the role's permission.
app.use("/api/products", requireAuth, productRoutes);
app.use("/api/orders", requireAuth, orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
