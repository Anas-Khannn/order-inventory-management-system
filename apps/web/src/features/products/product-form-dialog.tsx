import { zodResolver } from "@hookform/resolvers/zod";
import { productInputSchema, type ProductDto, type ProductInput } from "@repo/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useSaveProduct } from "@/hooks/queries";
import { ApiError } from "@/lib/http";
import { notify } from "@/lib/notify";

const empty: ProductInput = { name: "", sku: "", price: 0, stockQuantity: 0, status: "ACTIVE" };

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: ProductDto;
  /** Called with the product id once a save is applied (optimistically for edits). */
  onSaved?: (id: number) => void;
}) {
  const save = useSaveProduct();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<ProductInput>({ resolver: zodResolver(productInputSchema), defaultValues: empty, mode: "onTouched" });

  useEffect(() => {
    if (!open) return;
    reset(product ? { name: product.name, sku: product.sku, price: product.price, stockQuantity: product.stockQuantity, status: product.status } : empty);
    // Wait for the dialog's open animation frame before focusing the first field.
    requestAnimationFrame(() => setFocus("name"));
  }, [open, product, reset, setFocus]);

  const onSubmit = (input: ProductInput) => {
    if (product) {
      // Edits are optimistic: close right away, the table already shows the new values.
      onOpenChange(false);
      onSaved?.(product.id);
      save.mutate(
        { id: product.id, input },
        {
          onSuccess: () => notify.success("Product updated", { description: input.name }),
          onError: (e) => notify.error(e, { title: "Couldn't update product. Changes reverted.", retry: () => save.mutate({ id: product.id, input }) }),
        },
      );
      return;
    }
    save.mutate(
      { input },
      {
        onSuccess: (p) => {
          notify.success("Product created", { description: `${p.name} · ${p.sku}` });
          onSaved?.(p.id);
          onOpenChange(false);
        },
        onError: (e) => {
          if (e instanceof ApiError && e.code === "DUPLICATE_SKU") {
            setError("sku", { message: "This SKU is already in use" }, { shouldFocus: true });
          } else notify.error(e, { title: "Couldn't create product" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>{product ? `Update details for ${product.sku}.` : "Add an item to your catalog. Fields marked * are required."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field id="name" label="Name" required error={errors.name?.message}>
            <Input autoComplete="off" placeholder="e.g. Wireless Mouse" {...register("name")} />
          </Field>
          <Field id="sku" label="SKU" required error={errors.sku?.message} hint="Unique stock-keeping code, e.g. ELC-001.">
            <Input autoComplete="off" className="font-mono" {...register("sku")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="price" label="Price (PKR)" required error={errors.price?.message}>
              <Input type="number" inputMode="decimal" step="0.01" min={0} {...register("price", { valueAsNumber: true })} />
            </Field>
            <Field id="stock" label="Stock" required error={errors.stockQuantity?.message}>
              <Input type="number" inputMode="numeric" step="1" min={0} {...register("stockQuantity", { valueAsNumber: true })} />
            </Field>
          </div>
          <Field id="status" label="Status" hint="Inactive products are hidden from new orders.">
            <NativeSelect {...register("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!!product && !isDirty}>
              {product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
