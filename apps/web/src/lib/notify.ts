import { toast } from "sonner";
import { ApiError } from "@/lib/http";

/** Human-readable details from a Zod/validation ApiError, if any. */
export const errorDetails = (e: unknown) =>
  e instanceof ApiError && Array.isArray(e.details)
    ? (e.details as { message?: string }[])
        .map((d) => d.message)
        .filter(Boolean)
        .join("\n") || undefined
    : undefined;

/** Single entry point for feedback toasts so wording, duration and actions stay consistent. */
export const notify = {
  success: (title: string, opts?: { description?: string; action?: { label: string; onClick: () => void } }) =>
    toast.success(title, { description: opts?.description, action: opts?.action }),

  /** Error toast; offers a Retry button when the failed action can be repeated. */
  error: (e: unknown, opts?: { title?: string; retry?: () => void }) => {
    const message = e instanceof Error ? e.message : "Something went wrong";
    return toast.error(opts?.title ?? message, {
      description: opts?.title ? message : errorDetails(e),
      action: opts?.retry ? { label: "Retry", onClick: opts.retry } : undefined,
      duration: 6000,
    });
  },

  /** Confirms an already-applied (optimistic) change and lets the user reverse it. */
  undoable: (title: string, undo: () => void, description?: string) =>
    toast.success(title, { description, action: { label: "Undo", onClick: undo }, duration: 6000 }),

  /** Loading → success/error toast tied to a promise. */
  promise: <T,>(p: Promise<T>, msgs: { loading: string; success: (v: T) => string; error?: string }) =>
    toast.promise(p, { loading: msgs.loading, success: msgs.success, error: (e: unknown) => msgs.error ?? (e instanceof Error ? e.message : "Failed") }),
};
