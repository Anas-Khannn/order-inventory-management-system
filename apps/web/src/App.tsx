import { useEffect, useState } from "react";
import { AppShell, NAV, type NavKey } from "@/components/app-shell";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { OrdersPage } from "@/features/orders/orders-page";
import { ProductsPage } from "@/features/products/products-page";
import { parseHash } from "@/hooks/use-hash-query";

/** Tiny hash router so the current page survives refreshes and works with back/forward. */
const readHash = (): NavKey => {
  const { path } = parseHash();
  return NAV.some((n) => n.key === path) ? (path as NavKey) : "dashboard";
};

export default function App() {
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
