import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DetailPageLayoutProps {
  /** Header row (breadcrumb + title + actions), typically a <DetailHeader />. */
  header?: ReactNode;
  /** Master content: record details + line items, etc. */
  children: ReactNode;
  /** Persistent right-side context panel (Timeline / Notes / Activities …). */
  contextPanel?: ReactNode;
  className?: string;
}

/**
 * Bounded, centered two-column master-detail shell for every detail (View) page.
 * Left column holds the record data; the right column is a persistent context
 * panel that sticks while the master content scrolls, with its own scrollbar.
 * Collapses to a single column below `lg`.
 */
export function DetailPageLayout({
  header,
  children,
  contextPanel,
  className,
}: DetailPageLayoutProps) {
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      {header && <div className="mb-5">{header}</div>}
      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          contextPanel && "lg:grid-cols-[minmax(0,1fr)_360px]",
          className
        )}
      >
        <div className="min-w-0 space-y-5">{children}</div>
        {contextPanel && (
          <aside className="min-w-0 print:hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            {contextPanel}
          </aside>
        )}
      </div>
    </main>
  );
}
