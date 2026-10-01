import { ordersFacade } from "./orders.facade";
import { productsFacade } from "./products.facade";

export const api = { products: productsFacade, orders: ordersFacade };
