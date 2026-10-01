import { Ban, Boxes, LayoutDashboard, Monitor, Moon, Package, PackageX, ShoppingCart, Sun, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRestockCount } from "@/hooks/queries";
import { useHashLocation } from "@/hooks/use-hash-query";
import { cn } from "@/lib/utils";

export type NavKey = "dashboard" | "products" | "orders";
type Navigate = (k: NavKey, query?: Record<string, string>) => void;

export const NAV: { key: NavKey; label: string; icon: LucideIcon; description: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "A snapshot of sales, orders and stock." },
  { key: "products", label: "Products", icon: Package, description: "Manage your catalog, pricing and stock levels." },
  { key: "orders", label: "Orders", icon: ShoppingCart, description: "Create, review and cancel customer orders." },
];

/** One-click filtered views. Active when the URL carries all of their params. */
const VIEWS: { label: string; icon: LucideIcon; page: NavKey; query: Record<string, string> }[] = [
  { label: "Low stock", icon: TriangleAlert, page: "products", query: { status: "ACTIVE", stock: "LOW" } },
  { label: "Out of stock", icon: PackageX, page: "products", query: { status: "ACTIVE", stock: "OUT" } },
  { label: "Cancelled orders", icon: Ban, page: "orders", query: { status: "CANCELLED" } },
];

const THEMES: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ThemeControl() {
  const { theme, setTheme } = useTheme();
  const { state, isMobile } = useSidebar();
  const current = THEMES.find((t) => t.value === theme)!;

  // Collapsed rail: one button that cycles, with a tooltip naming the current theme.
  if (state === "collapsed" && !isMobile) {
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]!;
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip={`Theme: ${current.label} (click for ${next.label.toLowerCase()})`} onClick={() => setTheme(next.value)} aria-label={`Theme: ${current.label}. Switch to ${next.label}`}>
            <current.icon />
            <span>{current.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="space-y-1.5 px-2">
      <p className="text-xs font-medium text-sidebar-foreground/70">Theme</p>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-md border border-sidebar-border bg-background p-0.5">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded py-1.5 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring coarse:py-2.5",
              theme === value ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AppSidebar({ onNavigate }: { onNavigate: Navigate }) {
  const { path, params } = useHashLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const restock = useRestockCount();
  const page = (NAV.some((n) => n.key === path) ? path : "dashboard") as NavKey;

  const go: Navigate = (k, q) => {
    onNavigate(k, q);
    if (isMobile) setOpenMobile(false);
  };
  const activeView = VIEWS.find((v) => v.page === page && Object.entries(v.query).every(([k, val]) => params.get(k) === val));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => go("dashboard")} tooltip="Order & Inventory" className="gap-3">
              <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Boxes className="size-4" aria-hidden />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">Order & Inventory</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Store console</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton isActive={page === key && !activeView} tooltip={label} onClick={() => go(key)}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  {key === "products" && !!restock && (
                    <SidebarMenuBadge className="text-amber-700 dark:text-amber-400" aria-label={`${restock} need restocking`}>
                      {restock}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Saved views</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {VIEWS.map((v) => (
                <SidebarMenuItem key={v.label}>
                  <SidebarMenuButton isActive={activeView === v} tooltip={v.label} onClick={() => go(v.page, v.query)}>
                    <v.icon />
                    <span>{v.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="pb-3">
        <ThemeControl />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppShell({ active, onSelect, children }: { active: NavKey; onSelect: Navigate; children: ReactNode }) {
  const current = NAV.find((n) => n.key === active)!;

  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <AppSidebar onNavigate={onSelect} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
          <SidebarTrigger />
          <div aria-hidden className="mx-1 h-4 w-px bg-border" />
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Order & Inventory</span>
            <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>
              /
            </span>
            <span className="truncate font-medium" aria-current="page">
              {current.label}
            </span>
          </nav>
        </header>
        <div id="main" tabIndex={-1} key={active} className="mx-auto w-full max-w-7xl px-4 py-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 focus:outline-none sm:px-6 lg:py-8">
          <div className="mb-6 space-y-1">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{current.label}</h1>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
