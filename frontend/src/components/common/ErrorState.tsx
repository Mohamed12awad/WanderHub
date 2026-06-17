import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  icon?: React.ElementType;
  title?: ReactNode;
  description?: ReactNode;
  /** When provided, renders a "Try again" button. */
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Unified error state for failed data loads. Used by PageShell's `state.isError`
 * and composable directly. Replaces the scattered one-line
 * `<div className="p-6 text-destructive">…</div>` returns across view pages.
 */
export function ErrorState({
  icon: Icon = AlertCircle,
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  retryLabel = "Try again",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex min-h-[280px] items-center justify-center px-4 py-12 text-center", className)}>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <Icon className="h-7 w-7 text-destructive" />
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-base font-semibold">{title}</p>
          {description && (
            <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
        {(action || onRetry) && (
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            {action}
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                {retryLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
