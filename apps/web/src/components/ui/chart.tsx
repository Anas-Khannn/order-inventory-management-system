import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

/** shadcn-style chart config: each series gets a label and a colour exposed as `var(--color-<key>)`. */
export type ChartConfig = Record<string, { label: string; color: string }>;

const ChartCtx = React.createContext<ChartConfig | null>(null);

export function ChartContainer({
  config,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { config: ChartConfig; children: React.ReactElement }) {
  const vars = Object.fromEntries(Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color])) as React.CSSProperties;
  return (
    <ChartCtx.Provider value={config}>
      <div
        className={cn(
          "w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-surface]:outline-none [&_.recharts-cartesian-grid_line]:stroke-border",
          className,
        )}
        style={vars}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartCtx.Provider>
  );
}

export const ChartTooltip = Tooltip;

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel,
  labelFormatter,
  valueFormatter = (v) => String(v),
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => React.ReactNode;
  valueFormatter?: (v: number | string) => React.ReactNode;
}) {
  const config = React.useContext(ChartCtx);
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-32 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      {!hideLabel && label !== undefined && <div className="mb-1.5 font-medium">{labelFormatter ? labelFormatter(label) : label}</div>}
      <div className="space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name);
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: config?.[key]?.color ?? item.color }} />
                {config?.[key]?.label ?? key}
              </span>
              <span className="font-medium tabular-nums">{item.value !== undefined ? valueFormatter(item.value) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
