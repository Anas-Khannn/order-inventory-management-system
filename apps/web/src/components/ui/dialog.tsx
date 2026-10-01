import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;

/*
 * Spatial origin: remember where the last press (or keyboard activation) happened, so a dialog
 * grows out of the control that opened it and shrinks back into it on close.
 */
let lastPress: { x: number; y: number; t: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (lastPress = { x: e.clientX, y: e.clientY, t: performance.now() }), true);
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "Enter" && e.key !== " " && e.key.length !== 1) return;
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return;
      const r = el.getBoundingClientRect();
      lastPress = { x: r.left + r.width / 2, y: r.top + r.height / 2, t: performance.now() };
    },
    true,
  );
}

/** transform-origin for a just-mounted surface, relative to its own box. Falls back to centre. */
function originFor(el: HTMLElement) {
  if (!lastPress || performance.now() - lastPress.t > 1500) return "50% 50%";
  // offsetLeft/Top are layout positions, unaffected by the entrance scale already applied.
  return `${Math.round(lastPress.x - el.offsetLeft)}px ${Math.round(lastPress.y - el.offsetTop)}px`;
}
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, forwardedRef) => {
  const ref = React.useCallback(
    (el: HTMLDivElement | null) => {
      if (el) el.style.transformOrigin = originFor(el);
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );
  return (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-scrim fixed inset-0 z-50 bg-black/40" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Centred with inset + auto margins (not translate) so the transform is free for the origin-aware scale.
        "dialog-surface fixed inset-0 z-50 m-auto grid h-fit max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg gap-4 overflow-y-auto rounded-xl border bg-background p-5 shadow-2xl sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md opacity-70 transition-[opacity,background-color] hover:bg-accent hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11 coarse:w-11">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";

export const DialogHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex flex-col space-y-1.5", className)} {...p} />;
export const DialogFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...p} />
);
export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...p }, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...p} />,
);
DialogTitle.displayName = "DialogTitle";
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...p }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...p} />);
DialogDescription.displayName = "DialogDescription";
