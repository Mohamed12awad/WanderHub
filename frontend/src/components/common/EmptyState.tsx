import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Defaults to an Inbox glyph. Pass any lucide icon component. */
  icon?: React.ElementType;
  title: ReactNode;
  description?: ReactNode;
  /** Optional call-to-action (e.g. an "Add" button or link). */
  action?: ReactNode;
  className?: string;
}

/**
 * Unified empty state — extracted from the bespoke block that lived inside
 * GenericTable. Compose it in a page body (lists render it BELOW their toolbar
 * so the search/filters survive; standalone pages render it as their content).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground/70">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
