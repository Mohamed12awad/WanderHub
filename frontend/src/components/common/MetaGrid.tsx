import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Strict, aligned definition grid for record metadata (Customer, Currency, …).
 * Labels are muted/uppercase, values standard weight — easy to scan.
 */
export function MetaGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

/**
 * Single label/value pair. Renders nothing when empty so callers can list every
 * possible field without conditional clutter.
 */
export function MetaField({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  const content = children ?? value;
  if (content == null || content === "") return null;
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">{content}</dd>
    </div>
  );
}
