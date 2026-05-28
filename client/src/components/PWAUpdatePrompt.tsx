/**
 * PWAUpdatePrompt.tsx
 * Shows a non-intrusive toast when a new service worker version is available.
 * Uses workbox-window to detect SW lifecycle events.
 * Only active in production builds (SW is disabled in dev mode).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function PWAUpdatePrompt() {
  const [wb, setWb] = useState<import("workbox-window").Workbox | null>(null);

  useEffect(() => {
    // Only register in production and when SW is supported
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      import.meta.env.DEV
    ) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { Workbox } = await import("workbox-window");
        if (!mounted) return;

        const workbox = new Workbox("/sw.js");
        setWb(workbox);

        workbox.addEventListener("waiting", () => {
          toast("A new version of EduChamp is available.", {
            duration: Infinity,
            action: {
              label: "Update now",
              onClick: () => {
                workbox.messageSkipWaiting();
                window.location.reload();
              },
            },
            onDismiss: () => {
              // User dismissed — they'll get the update on next page load
            },
          });
        });

        workbox.addEventListener("controlling", () => {
          // New SW took control — reload to use the latest assets
          window.location.reload();
        });

        workbox.register();
      } catch (err) {
        // PWA registration is non-critical; log and continue
        console.warn("[PWA] Service worker registration failed:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // This component renders nothing — it only manages the SW lifecycle
  return null;
}
