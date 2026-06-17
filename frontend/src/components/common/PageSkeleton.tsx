import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Number of content blocks to render below the header skeleton. */
  rows?: number;
  className?: string;
}

/**
 * Shell-aware loading placeholder. PageShell renders this for `state.isLoading`
 * so the page keeps its width/padding instead of collapsing to a centered
 * spinner mid-fetch. Callers may pass a bespoke skeleton via `state.skeleton`.
 */
export function PageSkeleton({ rows = 3, className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-56" />
      </div>
      {/* content blocks */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
