import { useSlidingThumb } from "@/hooks/use-sliding-thumb";
import { cn } from "@/lib/utils";

/** Single-choice filter (radio group semantics) with a thumb that glides to the selection. */
export function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: V;
  options: { value: V; label: string; count?: number }[];
  onChange: (v: V) => void;
  className?: string;
}) {
  const { container, thumbStyle } = useSlidingThumb<HTMLDivElement>(options.findIndex((o) => o.value === value));
  return (
    <div ref={container} role="radiogroup" aria-label={label} className={cn("relative inline-flex rounded-md border bg-muted/40 p-0.5", className)}>
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 rounded bg-background shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]" style={thumbStyle} />
      {options.map((o) => (
        <button
          key={o.value || "all"}
          data-segment
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:opacity-70 coarse:py-2.5 sm:flex-none",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="tabular-nums text-muted-foreground">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
