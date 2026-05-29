/**
 * StreamdownRenderer — lazy-loaded wrapper for the Streamdown markdown renderer.
 *
 * Streamdown pulls in KaTeX, Mermaid, Shiki, and rehype-katex which together
 * add ~11 MB to the vendor-misc bundle when imported eagerly. By wrapping it in
 * React.lazy + dynamic import, those packages are split into a separate async
 * chunk that is only fetched when the first chat/tutor message is rendered.
 *
 * Usage:
 *   <StreamdownRenderer className="prose ...">{content}</StreamdownRenderer>
 *
 * While the chunk is loading a lightweight skeleton is shown so the UI never
 * blocks. Once loaded the component is cached for the lifetime of the session.
 */

import { Suspense, lazy, type ReactNode } from "react";

// ---- Lazy-loaded inner component ------------------------------------------ //

const LazyStreamdown = lazy(() =>
  import("streamdown").then((mod) => ({
    // Re-export as a default so React.lazy can consume it
    default: mod.Streamdown as React.ComponentType<{
      children?: ReactNode;
      className?: string;
    }>,
  }))
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
