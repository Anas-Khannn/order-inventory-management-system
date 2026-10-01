/**
 * Collapsible sidebar, ported from shadcn/ui's `sidebar` block (same component API and
 * data-attributes) for this Tailwind 3 setup. Desktop collapses to an icon rail; mobile
 * opens as a sheet. State persists in a cookie and toggles with Ctrl/⌘+B.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { project, rubberband, spring, velocityFrom, type SpringHandle } from "@/lib/spring";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "15rem";
const SIDEBAR_WIDTH_MOBILE = "17rem";
const SIDEBAR_WIDTH_ICON = "3.25rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

const readCookie = () => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=(true|false)`));
  return m ? m[1] === "true" : undefined;
};

export function SidebarProvider({ defaultOpen = true, className, style, children, ...props }: React.ComponentProps<"div"> & { defaultOpen?: boolean }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [open, _setOpen] = React.useState(() => readCookie() ?? defaultOpen);

  const setOpen = React.useCallback((value: boolean) => {
    _setOpen(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const toggleSidebar = React.useCallback(() => (isMobile ? setOpenMobile((o) => !o) : setOpen(!open)), [isMobile, open, setOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const value = React.useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={0}>
        <div
          style={{ "--sidebar-width": SIDEBAR_WIDTH, "--sidebar-width-icon": SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

/**
 * Phone navigation sheet driven by springs instead of CSS keyframes, so it is fully
 * interruptible: it tracks the finger 1:1 (respecting the grab point), rubber-bands past
 * its open edge, projects the release velocity to decide open vs. closed, and hands that
 * velocity to the settling spring. It can be grabbed again at any moment mid-animation.
 */
function MobileSheet({ open, onOpenChange, side, children }: { open: boolean; onOpenChange: (o: boolean) => void; side: "left" | "right"; children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(open);
  const panel = React.useRef<HTMLDivElement | null>(null);
  // Radix mounts portal content a render late, so track the element to know when it exists.
  const [panelEl, setPanelEl] = React.useState<HTMLDivElement | null>(null);
  const panelRef = React.useCallback((el: HTMLDivElement | null) => {
    panel.current = el;
    setPanelEl(el);
  }, []);
  const overlay = React.useRef<HTMLDivElement>(null);
  const anim = React.useRef<SpringHandle | null>(null);
  const pos = React.useRef<number | null>(null); // presentation value (px); 0 = fully open
  const releaseVelocity = React.useRef(0);
  const drag = React.useRef<{ id: number; x0: number; y0: number; origin: number; locked: boolean | null; samples: { t: number; x: number }[] } | null>(null);
  const suppressClick = React.useRef(false);
  const dir = side === "left" ? -1 : 1; // closed offset direction

  const width = () => panel.current?.offsetWidth ?? 272;
  const apply = (x: number) => {
    pos.current = x;
    if (panel.current) panel.current.style.transform = `translate3d(${x}px,0,0)`;
    if (overlay.current) overlay.current.style.opacity = String(Math.max(0, Math.min(1, 1 - Math.abs(x) / width())));
  };
  const settle = (to: number, velocity: number, damping: number, response: number, onComplete?: () => void) => {
    anim.current?.stop();
    anim.current = spring({ from: pos.current ?? to, to, velocity, damping, response, onUpdate: apply, onComplete });
  };

  React.useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  // Drive open/close from the current on-screen position, carrying any gesture velocity.
  React.useLayoutEffect(() => {
    if (!visible || !panelEl) return;
    if (open) {
      if (pos.current === null) apply(dir * width());
      settle(0, releaseVelocity.current, 1, 0.35);
    } else {
      settle(dir * width(), releaseVelocity.current, 1, 0.3, () => {
        pos.current = null;
        setVisible(false);
      });
    }
    releaseVelocity.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visible, panelEl]);

  React.useEffect(() => () => void anim.current?.stop(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Grab mid-flight: freeze the spring where it is and continue from there.
    const live = anim.current?.stop();
    if (live) pos.current = live.value;
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, origin: pos.current ?? 0, locked: null, samples: [{ t: e.timeStamp, x: pos.current ?? 0 }] };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (d.locked === null) {
      // ~10px hysteresis before committing to a direction; vertical intent stays a scroll.
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        d.locked = true;
        panel.current?.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 10) {
        d.locked = false;
      }
    }
    if (!d.locked) return;
    let x = d.origin + dx;
    // Past the fully-open edge: resist progressively instead of stopping dead.
    if (x * dir < 0) x = rubberband(x, width());
    apply(x);
    d.samples.push({ t: e.timeStamp, x });
    if (d.samples.length > 8) d.samples.shift();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.locked) {
      // A tap that interrupted a spring: let it finish toward the current target.
      if (anim.current && pos.current !== null && pos.current !== 0 && open) settle(0, 0, 1, 0.35);
      return;
    }
    suppressClick.current = true;
    const v = velocityFrom(d.samples);
    const projected = (pos.current ?? 0) + project(v);
    const shouldClose = projected * dir > width() / 2;
    releaseVelocity.current = v;
    if (shouldClose) onOpenChange(false);
    // Snapping back after a flick carries momentum, so allow a touch of overshoot (Apple's drawer: 0.8).
    else settle(0, v, Math.abs(v) > 300 ? 0.8 : 1, 0.3);
  };

  if (!visible) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay ref={overlay} forceMount className={cn("fixed inset-0 z-50 bg-black/45 opacity-0", !open && "pointer-events-none")} />
        <DialogPrimitive.Content
          ref={panelRef}
          forceMount
          data-sidebar="sidebar"
          data-mobile="true"
          onOpenAutoFocus={(e) => {
            // Keep focus inside the sheet without painting a ring on the first item for pointer users.
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={(e) => {
            // A drag that ends over a link must not also count as a tap on it.
            if (suppressClick.current) {
              e.preventDefault();
              e.stopPropagation();
              suppressClick.current = false;
            }
          }}
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE, transform: `translate3d(${dir * 100}%,0,0)`, touchAction: "pan-y" } as React.CSSProperties}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[--sidebar-width] select-none flex-col bg-sidebar text-sidebar-foreground shadow-2xl outline-none will-change-transform",
            side === "left" ? "left-0 border-r" : "right-0 border-l",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Main navigation and theme settings. Swipe to close.</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "icon",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { side?: "left" | "right"; variant?: "sidebar" | "floating" | "inset"; collapsible?: "offcanvas" | "icon" | "none" }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div className={cn("flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground", className)} {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileSheet open={openMobile} onOpenChange={setOpenMobile} side={side}>
        {children}
      </MobileSheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
    >
      {/* Spacer: reserves the sidebar's width in the layout and animates with it. */}
      <div
        className={cn(
          "relative h-svh w-[--sidebar-width] bg-transparent transition-[width] duration-300 ease-fluid",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon]",
        )}
      />
      <div
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-300 ease-fluid md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
            : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentProps<typeof Button>>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, state, isMobile } = useSidebar();
  const label = isMobile ? "Open navigation" : state === "expanded" ? "Collapse sidebar" : "Expand sidebar";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          data-sidebar="trigger"
          variant="ghost"
          size="icon"
          aria-label={label}
          className={cn("h-8 w-8", className)}
          onClick={(e) => {
            onClick?.(e);
            toggleSidebar();
          }}
          {...props}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {!isMobile && <kbd className="ml-2 font-sans text-[11px] opacity-70">Ctrl B</kbd>}
      </TooltipContent>
    </Tooltip>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

/** Thin hit-area on the sidebar edge: click to collapse/expand. */
export function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-out after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh min-w-0 flex-1 flex-col bg-background",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className,
      )}
      {...props}
    />
  );
}

export const SidebarHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-sidebar="header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />
);

export const SidebarFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-sidebar="footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />
);

export const SidebarSeparator = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div role="separator" data-sidebar="separator" className={cn("mx-2 h-px w-auto bg-sidebar-border", className)} {...props} />
);

export const SidebarContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-sidebar="content" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)} {...props} />
);

export const SidebarGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-sidebar="group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
);

export const SidebarGroupLabel = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-sidebar="group-label"
    className={cn(
      "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none transition-[margin,opacity] duration-200 ease-out",
      "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
      className,
    )}
    {...props}
  />
);

export const SidebarGroupContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div data-sidebar="group-content" className={cn("w-full text-sm", className)} {...props} />
);

export const SidebarMenu = ({ className, ...props }: React.ComponentProps<"ul">) => (
  <ul data-sidebar="menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />
);

export const SidebarMenuItem = ({ className, ...props }: React.ComponentProps<"li">) => (
  <li data-sidebar="menu-item" className={cn("group/menu-item relative", className)} {...props} />
);

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding,background-color,color] duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 coarse:h-11 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-sidebar-foreground/80",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: { default: "h-8 text-sm", sm: "h-7 text-xs", lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean; tooltip?: string } & VariantProps<typeof sidebarMenuButtonVariants>
>(({ asChild = false, isActive = false, variant, size, tooltip, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const { isMobile, state } = useSidebar();
  const button = (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

/** Small count at the end of a menu row (hidden in icon mode). */
export const SidebarMenuBadge = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-sidebar="menu-badge"
    className={cn(
      "pointer-events-none absolute right-1.5 top-1/2 flex h-5 min-w-5 -translate-y-1/2 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground/70",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
);
