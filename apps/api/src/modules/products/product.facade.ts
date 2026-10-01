import type { ListProductsQuery, Paginated, ProductDto, ProductInput, ProductStatus } from "@repo/shared";
import { conflict, isUniqueViolation, notFound } from "../../errors";
import { productRepository, type ProductRow } from "./product.repository";

export const toProductDto = (r: ProductRow): ProductDto => ({
  id: r.id,
  name: r.name,
  sku: r.sku,
  price: Number(r.price),
  stockQuantity: r.stockQuantity,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const skuTaken = () => conflict("DUPLICATE_SKU", "A product with this SKU already exists", [{ path: "sku", message: "SKU already exists" }]);

/**
 * FACADE: the single entry point controllers use for everything product-related.
 * Hides the repository, mapping and error translation behind a small API.
 */
export const productFacade = {
  async list(query: ListProductsQuery): Promise<Paginated<ProductDto>> {
    const { rows, total } = await productRepository.list(query);
    return {
      data: rows.map(toProductDto),
      meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) },
    };
  },

  async listActiveOptions(): Promise<ProductDto[]> {
    return (await productRepository.listActive()).map(toProductDto);
  },

  async get(id: number): Promise<ProductDto> {
    const row = await productRepository.findById(id);
    if (!row) throw notFound("Product");
    return toProductDto(row);
  },

  async create(input: ProductInput): Promise<ProductDto> {
    try {
      return toProductDto(await productRepository.insert(input));
    } catch (e) {
      throw isUniqueViolation(e) ? skuTaken() : e;
    }
  },

  async update(id: number, input: ProductInput): Promise<ProductDto> {
    try {
      const row = await productRepository.update(id, input);
      if (!row) throw notFound("Product");
      return toProductDto(row);
    } catch (e) {
      throw isUniqueViolation(e) ? skuTaken() : e;
    }
  },

  async setStatus(id: number, status: ProductStatus): Promise<ProductDto> {
    const row = await productRepository.setStatus(id, status);
    if (!row) throw notFound("Product");
    return toProductDto(row);
  },
};
