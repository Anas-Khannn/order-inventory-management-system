import { PERMISSIONS, USER_ROLE } from "@repo/shared";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Boxes, Moon, PackageCheck, ShoppingCart, Sun, TriangleAlert } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { ROLE_LABEL } from "@/facades/auth.facade";
import { useHashLocation } from "@/hooks/use-hash-query";
import { fluid, gentle, riseItem, snappy, stagger } from "@/lib/motion";
import { ForgotPasswordPage } from "./forgot-password-page";
import { LoginPage } from "./login-page";
import { ResetPasswordPage } from "./reset-password-page";

/** Order of the auth flow. Moving to a later step slides left, going back slides right. */
const ROUTES = ["login", "forgot-password", "reset-password"] as const;
type AuthRoute = (typeof ROUTES)[number];
export const isAuthRoute = (path: string): path is AuthRoute => (ROUTES as readonly string[]).includes(path);

const slide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28, filter: "blur(4px)" }),
  center: { opacity: 1, x: 0, filter: "blur(0px)", transition: fluid },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, filter: "blur(4px)", transition: { ...fluid, visualDuration: 0.25 } }),
};

/** Animates its height to fit the content, so switching steps resizes the card smoothly. */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div animate={{ height }} initial={false} transition={fluid} className="relative">
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const dark = resolved === "dark";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:h-11 coarse:w-11"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={resolved} initial={{ rotate: -90, scale: 0, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0, opacity: 0 }} transition={snappy}>
          {dark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

const Logo = () => (
  <span className="flex items-center gap-2.5 font-semibold">
    <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <Boxes className="size-4" aria-hidden />
    </span>
    Order & Inventory
  </span>
);

/** A small card that drifts slowly, as if the console were live behind the glass. */
function FloatCard({ children, className, delay, drift }: { children: ReactNode; className: string; delay: number; drift: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...gentle, delay }}
      className={`absolute ${className}`}
    >
      <motion.div
        animate={{ y: [0, drift, 0] }}
        transition={{ duration: 6 + delay * 4, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl border bg-background/80 p-3.5 shadow-lg shadow-black/[0.04] backdrop-blur-md dark:shadow-black/30"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const BARS = [38, 52, 44, 68, 57, 80, 72];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden border-r bg-muted/40 lg:flex lg:flex-col lg:justify-between lg:p-10" aria-hidden>
      {/* Dot grid that fades out toward the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--foreground)/0.09)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <Logo />

      <div className="relative mx-auto h-72 w-full max-w-md">
        <FloatCard className="left-0 top-2 w-60" delay={0.15} drift={-6}>
          <p className="text-xs text-muted-foreground">Revenue, last 7 days</p>
          <p className="mt-1 font-semibold tabular-nums">PKR 1,284,500</p>
          <div className="mt-3 flex h-12 items-end gap-1.5">
            {BARS.map((h, i) => (
              <motion.span
                key={i}
                className="flex-1 origin-bottom rounded-sm bg-chart-1/80"
                style={{ height: `${h}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...gentle, delay: 0.4 + i * 0.05 }}
              />
            ))}
          </div>
        </FloatCard>
        <FloatCard className="right-0 top-20 w-52" delay={0.3} drift={7}>
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <TriangleAlert className="h-3.5 w-3.5" /> Low stock
          </div>
          <p className="mt-1.5 text-sm">Wireless mouse</p>
          <p className="text-xs text-muted-foreground">3 units left</p>
        </FloatCard>
        <FloatCard className="bottom-0 left-12 w-64" delay={0.45} drift={-5}>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PackageCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">ORD-1042 created</p>
              <p className="text-xs text-muted-foreground">
                <ShoppingCart className="mr-1 inline h-3 w-3" />3 items · PKR 12,500
              </p>
            </div>
          </div>
        </FloatCard>
      </div>

      <motion.div variants={stagger(0.08, 0.6)} initial="hidden" animate="shown" className="relative space-y-4">
        <motion.p variants={riseItem} className="max-w-sm text-xl font-semibold leading-snug tracking-tight">
          Stock, orders and sales in one console, with access set by role.
        </motion.p>
        <motion.ul variants={riseItem} className="flex flex-wrap gap-2">
          {USER_ROLE.map((r) => (
            <li key={r} className="rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{ROLE_LABEL[r]}</span> · {PERMISSIONS[r].length} permissions
            </li>
          ))}
        </motion.ul>
      </motion.div>
    </aside>
  );
}

/** Everything a signed-out visitor sees. Routes live in the hash, like the rest of the app. */
export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { path, params } = useHashLocation();
  const route: AuthRoute = isAuthRoute(path) ? path : "login";

  // Direction is derived during render from the previous route, so enter and exit agree.
  const prev = useRef(route);
  const dir = useRef(1);
  if (prev.current !== route) {
    dir.current = ROUTES.indexOf(route) >= ROUTES.indexOf(prev.current) ? 1 : -1;
    prev.current = route;
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <main id="main" className="flex flex-col px-4 py-4 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo />
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <AutoHeight>
              <AnimatePresence mode="popLayout" initial={false} custom={dir.current}>
                <motion.div key={route} custom={dir.current} variants={slide} initial="enter" animate="center" exit="exit">
                  {route === "login" && <LoginPage onSignedIn={onSignedIn} />}
                  {route === "forgot-password" && <ForgotPasswordPage initialEmail={params.get("email") ?? ""} />}
                  {route === "reset-password" && <ResetPasswordPage token={params.get("token") ?? ""} />}
                </motion.div>
              </AnimatePresence>
            </AutoHeight>
          </div>
        </div>
      </main>
    </div>
  );
}
