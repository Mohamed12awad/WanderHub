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
 * Single label/value pair. The label is ALWAYS rendered; when the value is empty
 * a muted "—" placeholder is shown so callers can list every possible field and
 * the label stays visible even with no data.
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
  const isEmpty = content == null || content === "";
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">
        {isEmpty ? <span className="text-muted-foreground/60">—</span> : content}
      </dd>
    </div>
  );
}
