import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/common/ErrorState";

export type PageWidth = "narrow" | "default" | "wide";

const WIDTH_CLASS: Record<PageWidth, string> = {
  narrow: "page-w-narrow",
  default: "page-w-default",
  wide: "page-w-wide",
};

interface PageShellState {
  isLoading?: boolean;
  isError?: boolean;
  /** Forwarded to the built-in ErrorState (title/description/onRetry). */
  errorProps?: React.ComponentProps<typeof ErrorState>;
  /** Override the default loading placeholder. */
  skeleton?: ReactNode;
}

interface PageShellProps {
  width?: PageWidth;
  /**
   * Full-bleed: drops the centered max-width column + horizontal padding.
   * For list/board views (GenericTable/GenericKanban) that own their own chrome.
   */
  bleed?: boolean;
  /**
   * Loading / error orchestration. Deliberately has NO `isEmpty` — swapping the
   * whole body would destroy a list's toolbar (search/filters/Add). Empty is the
   * body's responsibility (compose <EmptyState/> there).
   */
  state?: PageShellState;
  className?: string;
  children: ReactNode;
}

/**
 * The single page container every page composes: one width scale, one padding
 * token, one vertical rhythm (see `.page-*` utilities in index.css). Replaces
 * the per-page `max-w-* mx-auto p-*` drift.
 */
export function PageShell({
  width = "default",
  bleed = false,
  state,
  className,
  children,
}: PageShellProps) {
  const inner = state?.isError ? (
    <ErrorState {...state.errorProps} />
  ) : state?.isLoading ? (
    state.skeleton ?? <PageSkeleton />
  ) : (
    children
  );

  if (bleed) {
    return <div className={cn("page-gap min-h-full", className)}>{inner}</div>;
  }

  return (
    <div className="min-h-full">
      <div className={cn(WIDTH_CLASS[width], "page-pad page-gap", className)}>
        {inner}
      </div>
    </div>
  );
}
