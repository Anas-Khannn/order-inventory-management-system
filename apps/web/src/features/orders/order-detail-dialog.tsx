import { Ban } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ErrorState, LoadingRows } from "@/components/states";
import { Status } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-provider";
import { useCancelOrder, useOrder } from "@/hooks/queries";
import { formatDate, formatPKR } from "@/lib/format";
import { notify } from "@/lib/notify";

/** Text label + dot, so status never relies on colour alone. */
export const OrderStatusBadge = ({ status }: { status: "CREATED" | "CANCELLED" }) =>
  status === "CREATED" ? <Status tone="success">Created</Status> : <Status tone="danger">Cancelled</Status>;

const Meta = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm">{children}</dd>
  </div>
);

export function OrderDetailDialog({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const { data: order, isLoading, isError, error, refetch } = useOrder(orderId);
  const cancel = useCancelOrder();
  const canCancel = useAuth().can("orders:cancel");
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setConfirming(false);
    onClose();
  };

  const doCancel = (id: number, reference: string) => {
    setConfirming(false);
    // Optimistic: the badge flips and stock is restored in the UI immediately.
    cancel.mutate(id, {
      onSuccess: () => notify.success(`Order ${reference} cancelled`, { description: "Items were returned to stock." }),
      onError: (e) => notify.error(e, { title: `Couldn't cancel ${reference}. Nothing was changed.`, retry: () => doCancel(id, reference) }),
    });
  };

  return (
    <Dialog open={orderId !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <span>{order ? order.reference : "Order"}</span>
            {order && <OrderStatusBadge status={order.status} />}
          </DialogTitle>
          <DialogDescription>{order ? `Placed ${formatDate(order.createdAt)}` : "Loading order details…"}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <LoadingRows rows={3} />
        ) : isError ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : order ? (
          <div className="grid gap-5 text-sm animate-in fade-in-0 duration-200">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Meta label="Customer">{order.customerName}</Meta>
              <Meta label="Email">{order.customerEmail}</Meta>
              <Meta label={order.cancelledAt ? "Cancelled" : "Items"}>
                {order.cancelledAt ? formatDate(order.cancelledAt) : `${order.items.reduce((s, i) => s + i.quantity, 0)} units`}
              </Meta>
            </dl>
            <div>
              <Table className="[&_tr>*:first-child]:pl-0 [&_tr>*:last-child]:pr-0">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead data-align="right">Qty</TableHead>
                    <TableHead data-align="right">Unit price</TableHead>
                    <TableHead data-align="right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <p>{i.productName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{i.productSku}</p>
                      </TableCell>
                      <TableCell data-align="right">{i.quantity}</TableCell>
                      <TableCell data-align="right">{formatPKR(i.unitPrice)}</TableCell>
                      <TableCell data-align="right">{formatPKR(i.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-baseline justify-between border-t border-foreground/15 pt-3">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">{formatPKR(order.totalAmount)}</span>
            </div>

            {order.status === "CREATED" && canCancel && (
              <DialogFooter className="border-t pt-4">
                {confirming ? (
                  <div className="flex w-full flex-col gap-2 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 sm:flex-row sm:items-center sm:justify-end">
                    <span className="text-sm sm:mr-auto">Cancel this order and restore its stock?</span>
                    <Button variant="outline" onClick={() => setConfirming(false)} autoFocus>
                      Keep order
                    </Button>
                    <Button variant="destructive" onClick={() => doCancel(order.id, order.reference)}>
                      Yes, cancel order
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirming(true)}>
                    <Ban className="h-4 w-4" /> Cancel order
                  </Button>
                )}
              </DialogFooter>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
