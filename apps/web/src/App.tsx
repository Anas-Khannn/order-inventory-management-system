import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AppShell, NAV, type NavKey } from "@/components/app-shell";
import { AuthScreen, isAuthRoute } from "@/features/auth/auth-screen";
import { useAuth } from "@/features/auth/auth-provider";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { OrdersPage } from "@/features/orders/orders-page";
import { ProductsPage } from "@/features/products/products-page";
import { parseHash } from "@/hooks/use-hash-query";
import { fluid } from "@/lib/motion";

/** Tiny hash router so the current page survives refreshes and works with back/forward. */
const readHash = (): NavKey => {
  const { path } = parseHash();
  return NAV.some((n) => n.key === path) ? (path as NavKey) : "dashboard";
};

function Console() {
  const [page, setPage] = useState<NavKey>(readHash);
  // Bumped on every real navigation so the page remounts and re-reads its filters from the URL.
  const [visit, setVisit] = useState(0);

  useEffect(() => {
    const onHash = () => {
      setPage(readHash());
      setVisit((v) => v + 1);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /** Go to a page, optionally with pre-set filters (e.g. `{ stock: "LOW" }`). */
  const navigate = (k: NavKey, query?: Record<string, string>) => {
    const q = query ? new URLSearchParams(query).toString() : "";
    window.location.hash = `/${k}${q ? `?${q}` : ""}`;
    window.scrollTo({ top: 0 });
  };

  return (
    <AppShell active={page} onSelect={navigate}>
      {page === "dashboard" && <DashboardPage key={visit} onNavigate={navigate} />}
      {page === "products" && <ProductsPage key={visit} />}
      {page === "orders" && <OrdersPage key={visit} />}
    </AppShell>
  );
}

/**
 * Signed out: the auth flow. Signed in: the console. A deep link opened while signed out
 * (e.g. #/products?stock=LOW) stays in the URL, so signing in lands on that page.
 * The console only fades: a transform here would break its fixed sidebar and sticky header.
 */
export default function App() {
  const { session } = useAuth();

  const onSignedIn = () => {
    if (isAuthRoute(parseHash().path)) window.history.replaceState(null, "", "#/dashboard");
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {session ? (
        <motion.div key="console" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fluid}>
          <Console />
        </motion.div>
      ) : (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.2 } }} transition={fluid}>
          <AuthScreen onSignedIn={onSignedIn} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
