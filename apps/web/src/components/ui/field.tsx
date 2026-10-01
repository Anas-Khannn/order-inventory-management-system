import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + hint/error. Wires `aria-invalid` and `aria-describedby` onto the control
 * so the error is announced and styled (inputs turn red via `aria-[invalid=true]`).
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactElement;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, "aria-invalid": !!error || undefined, "aria-describedby": describedBy, "aria-required": required || undefined })
    : children;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {control}
      {error ? <FieldMessage id={`${id}-error`} message={error} /> : hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const FieldMessage = ({ id, message }: { id?: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="text-xs text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
      {message}
    </p>
  ) : null;
