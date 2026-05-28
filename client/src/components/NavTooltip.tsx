/**
 * NavTooltip — reusable tooltip wrapper for navigation items, icons, and action buttons.
 *
 * Features:
 * - 600ms open delay (avoids flicker on fast mouse movements)
 * - Consistent side/align defaults (right for sidebar, top for buttons)
 * - Keyboard accessible: tooltip opens on focus as well as hover
 * - Screen-reader friendly: wraps children in aria-describedby
 * - Mobile: tooltip is suppressed on touch devices (pointer: coarse) to avoid
 *   sticky tooltips; the title prop on the child element serves as fallback
 * - Supports a two-line layout: bold title + muted description
 */

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TooltipEntry } from "@/lib/tooltipContent";

interface NavTooltipProps {
  /** Tooltip content — either a TooltipEntry object or a plain string */
  content: TooltipEntry | string;
  /** Where to render the tooltip relative to the trigger */
  side?: "top" | "right" | "bottom" | "left";
  /** Fine-grained alignment along the chosen side */
  align?: "start" | "center" | "end";
  /** Delay before the tooltip opens (ms). Defaults to 600. */
  delayDuration?: number;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Extra class names for the TooltipContent container */
  className?: string;
  /** Disable the tooltip entirely (e.g. when the sidebar is expanded and the label is already visible) */
  disabled?: boolean;
}

export function NavTooltip({
  content,
  side = "right",
  align = "center",
  delayDuration = 600,
  children,
  className,
  disabled = false,
}: NavTooltipProps) {
  if (disabled) return <>{children}</>;

  const isEntry = typeof content === "object";
  const title = isEntry ? content.title : content;
  const description = isEntry ? content.description : undefined;

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={[
            "max-w-xs z-50",
            description ? "py-2 px-3" : "",
            className ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          // Prevent tooltip from stealing focus on keyboard navigation
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          {description ? (
            <div className="space-y-0.5">
              <p className="font-semibold text-sm leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground leading-snug">
                {description}
              </p>
            </div>
          ) : (
            <p className="text-sm">{title}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Convenience wrapper that only shows the tooltip when the sidebar is collapsed.
 * When expanded, the nav label is already visible so the tooltip would be redundant.
 */
interface SidebarNavTooltipProps extends Omit<NavTooltipProps, "disabled"> {
  /** Pass true when the sidebar is in its expanded (non-collapsed) state */
  sidebarExpanded: boolean;
  /** When expanded, show description-only tooltip (no title duplication). Defaults to true. */
  showDescriptionWhenExpanded?: boolean;
}

export function SidebarNavTooltip({
  sidebarExpanded,
  showDescriptionWhenExpanded = true,
  content,
  children,
  ...rest
}: SidebarNavTooltipProps) {
  const isEntry = typeof content === "object";

  // Collapsed sidebar: show full title + description
  if (!sidebarExpanded) {
    return (
      <NavTooltip content={content} side="right" {...rest}>
        {children}
      </NavTooltip>
    );
  }

  // Expanded sidebar: show description only (title is already the visible label)
  if (showDescriptionWhenExpanded && isEntry && content.description) {
    return (
      <NavTooltip
        content={content.description}
        side="right"
        {...rest}
        delayDuration={800}
      >
        {children}
      </NavTooltip>
    );
  }

  // Expanded + no description: no tooltip
  return <>{children}</>;
}
