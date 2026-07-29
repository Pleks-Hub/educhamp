// ── Cross-browser polyfills ───────────────────────────────────────────────────
// requestIdleCallback polyfill for Safari (not supported until Safari 18)
if (typeof window !== "undefined" && !("requestIdleCallback" in window)) {
  (window as any).requestIdleCallback = (
    cb: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => {
    const timeout = options?.timeout ?? 50;
    return window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, timeout - (performance.now() % timeout)),
      });
    }, 1) as unknown as number;
  };
  (window as any).cancelIdleCallback = (id: number) => clearTimeout(id);
}

// queueMicrotask polyfill for Safari < 12.1
if (typeof window !== "undefined" && !("queueMicrotask" in window)) {
  (window as any).queueMicrotask = (cb: () => void) => Promise.resolve().then(cb);
}

import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once on failure — avoids hammering the server on transient errors
      retry: 1,
      // Stale time of 30s to reduce redundant refetches on tab focus (Safari re-focuses often)
      staleTime: 30_000,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// ─── Read-Only Impersonation Mode: block mutations globally ─────────────────
const READONLY_ALLOWED_MUTATIONS = [
  "admin.logImpersonationAction",
  "admin.endImpersonation",
  "admin.extendImpersonation",
  "admin.impersonateUser",
  "auth.logout",
];

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "added") {
    const isReadOnly = (window as any).__educhamp_impersonation_readonly;
    if (!isReadOnly) return;
    // Check if this mutation is in the allowed list
    const mutationKey = event.mutation.options.mutationKey;
    const keyStr = Array.isArray(mutationKey) ? mutationKey.flat().join(".") : "";
    const isAllowed = READONLY_ALLOWED_MUTATIONS.some(m => keyStr.includes(m));
    if (!isAllowed && keyStr) {
      // Cancel the mutation by throwing
      event.mutation.destroy();
      // Show a toast notification
      import("sonner").then(({ toast }) => {
        toast.warning("Read-only mode active \u2014 this action is blocked to protect student data.");
      });
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Attach impersonation token so the server can swap ctx.user
        const token = sessionStorage.getItem("educhamp-impersonation-token");
        const exp = sessionStorage.getItem("educhamp-impersonation-expires");
        if (token && exp && Date.now() < parseInt(exp, 10)) {
          return { "x-impersonation-token": token };
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <PWAUpdatePrompt />
    </QueryClientProvider>
  </trpc.Provider>
);
