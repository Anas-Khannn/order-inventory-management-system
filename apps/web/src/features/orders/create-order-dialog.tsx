import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, type CreateOrderInput } from "@repo/shared";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldMessage } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateOrder, useProductOptions } from "@/hooks/queries";
import { formatPKR } from "@/lib/format";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const blankItem = { productId: Number.NaN, quantity: 1 };

export function CreateOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called with the new order id, e.g. to open its details from the toast. */
  onCreated?: (id: number) => void;
}) {
  const { data: options = [], isLoading } = useProductOptions(open);
  const create = useCreateOrder();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { customerName: "", customerEmail: "", items: [blankItem] },
    mode: "onTouched",
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });

  useEffect(() => {
    if (!open) return;
    reset({ customerName: "", customerEmail: "", items: [blankItem] });
    requestAnimationFrame(() => setFocus("customerName"));
  }, [open, reset, setFocus]);

  // Display-only estimate. The server always recalculates from DB prices.
  const lines = (items ?? []).map((i) => {
    const p = options.find((o) => o.id === i.productId);
    const qty = Number.isFinite(i.quantity) ? i.quantity : 0;
    return { product: p, qty, total: p ? p.price * qty : 0, overStock: !!p && qty > p.stockQuantity };
  });
  const estimate = lines.reduce((s, l) => s + l.total, 0);
  const anyOverStock = lines.some((l) => l.overStock);

  const onSubmit = (input: CreateOrderInput) =>
    create.mutate(input, {
      onSuccess: (o) => {
        notify.success(`Order ${o.reference} created`, {
          description: `${o.customerName} · ${formatPKR(o.totalAmount)}`,
          action: onCreated ? { label: "View", onClick: () => onCreated(o.id) } : undefined,
        });
        onOpenChange(false);
      },
      onError: (e) => notify.error(e, { title: "Couldn't create order" }),
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create order</DialogTitle>
          <DialogDescription>Stock is reserved the moment the order is placed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="customerName" label="Customer name" required error={errors.customerName?.message}>
              <Input autoComplete="name" {...register("customerName")} />
            </Field>
            <Field id="customerEmail" label="Customer email" required error={errors.customerEmail?.message}>
              <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...register("customerEmail")} />
            </Field>
          </div>

          <fieldset className="grid gap-2">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-medium leading-none">
                Items<span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </legend>
              <span className="text-xs text-muted-foreground">
                {fields.length} line{fields.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="grid gap-2">
              {fields.map((f, idx) => {
                const line = lines[idx];
                const itemError = errors.items?.[idx]?.productId?.message ?? errors.items?.[idx]?.quantity?.message;
                return (
                  <li key={f.id} className="grid gap-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-[1fr_84px_auto] items-start gap-2">
                      <NativeSelect
                        aria-label={`Product for line ${idx + 1}`}
                        aria-invalid={!!errors.items?.[idx]?.productId || undefined}
                        disabled={isLoading}
                        {...register(`items.${idx}.productId`, { valueAsNumber: true })}
                      >
                        <option value="">{isLoading ? "Loading products…" : "Select product"}</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id} disabled={o.stockQuantity === 0}>
                            {o.name} ({formatPKR(o.price)}) · {o.stockQuantity === 0 ? "out of stock" : `${o.stockQuantity} in stock`}
                          </option>
                        ))}
                      </NativeSelect>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={line?.product?.stockQuantity}
                        step={1}
                        aria-label={`Quantity for line ${idx + 1}`}
                        aria-invalid={!!errors.items?.[idx]?.quantity || line?.overStock || undefined}
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                      />
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${idx + 1}`} disabled={fields.length === 1} onClick={() => remove(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {itemError ? (
                      <FieldMessage message={itemError} />
                    ) : line?.overStock ? (
                      <FieldMessage message={`Only ${line.product!.stockQuantity} in stock`} />
                    ) : line?.product ? (
                      <p className="text-xs text-muted-foreground tabular-nums">Line total {formatPKR(line.total)}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <FieldMessage message={errors.items?.message ?? errors.items?.root?.message} />
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append(blankItem)}>
              <Plus className="h-4 w-4 transition-transform duration-200 group-hover/btn:rotate-90" /> Add item
            </Button>
          </fieldset>

          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Estimated total</p>
              <p className="text-[11px] text-muted-foreground">Final total is calculated by the server.</p>
            </div>
            <p key={estimate} className={cn("text-lg font-semibold tabular-nums animate-in fade-in-0 zoom-in-95 duration-200")}>
              {formatPKR(estimate)}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={anyOverStock}>
              {create.isPending ? "Placing order…" : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
