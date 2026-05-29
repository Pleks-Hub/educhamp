/**
 * StreamdownRenderer — lazy-loaded wrapper for the Streamdown markdown renderer.
 *
 * Streamdown pulls in KaTeX, Mermaid, Shiki, and rehype-katex which together
 * add ~9 MB to the vendor-shiki/vendor-markdown chunks when imported eagerly.
 * By wrapping it in React.lazy + dynamic import those packages are fetched only
 * when the first chat/tutor message is rendered.
 *
 * Usage:
 *   <StreamdownRenderer className="prose ...">{content}</StreamdownRenderer>
 *
 * Use `useStreamdownReady()` to know when the chunk has finished downloading so
 * parent components can show a branded loading overlay.
 */

import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";

// ---- Global chunk-loading state (shared across all instances) -------------- //

let _chunkLoaded = false;
const _listeners = new Set<() => void>();

function markChunkLoaded() {
  _chunkLoaded = true;
  _listeners.forEach((fn) => fn());
  _listeners.clear();
}

/**
 * Returns `true` once the streamdown/shiki async chunk has finished downloading.
 * Safe to call before any StreamdownRenderer has mounted.
 */
export function useStreamdownReady(): boolean {
  const [ready, setReady] = useState(_chunkLoaded);
  useEffect(() => {
    if (_chunkLoaded) {
      setReady(true);
      return;
    }
    const handler = () => setReady(true);
    _listeners.add(handler);
    return () => {
      _listeners.delete(handler);
    };
  }, []);
  return ready;
}

// ---- Lazy-loaded inner component ------------------------------------------ //

const LazyStreamdown = lazy(() =>
  import("streamdown").then((mod) => {
    markChunkLoaded();
    return {
      // Re-export as a default so React.lazy can consume it
      default: mod.Streamdown as React.ComponentType<{
        children?: ReactNode;
        className?: string;
      }>,
    };
  })
);

// ---- Skeleton shown while the chunk loads ---------------------------------- //

function StreamdownSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted"
          style={{ width: `${60 + ((i * 17) % 35)}%` }}
        />
      ))}
    </div>
  );
}

// ---- Public component ------------------------------------------------------ //

interface StreamdownRendererProps {
  children?: ReactNode;
  className?: string;
  /** Number of skeleton lines to show while loading (default 3) */
  skeletonLines?: number;
}

export function StreamdownRenderer({
  children,
  className,
  skeletonLines = 3,
}: StreamdownRendererProps) {
  return (
    <Suspense fallback={<StreamdownSkeleton lines={skeletonLines} />}>
      <LazyStreamdown className={className}>{children}</LazyStreamdown>
    </Suspense>
  );
}

export default StreamdownRenderer;
