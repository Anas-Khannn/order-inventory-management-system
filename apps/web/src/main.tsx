import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider, useTheme } from "./components/theme-provider";
import { AuthProvider } from "./features/auth/auth-provider";
// Self-hosted Geist (variable weights) so typography never depends on a third-party CDN.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./index.css";

// iOS Safari only applies :active (our instant press feedback) when a touch listener exists.
document.addEventListener("touchstart", () => {}, { passive: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } },
});

const ThemedToaster = () => (
  <Toaster richColors closeButton position="bottom-right" visibleToasts={4} theme={useTheme().resolved} toastOptions={{ duration: 4000 }} />
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* "user": honour the OS reduce-motion setting (transforms drop, fades stay). */}
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <App />
          </AuthProvider>
        </MotionConfig>
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
