import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb { label: string; href?: string; }

export function AppBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5 flex-wrap">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
          {crumb.href && i < crumbs.length - 1 ? (
            <Link
              to={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[160px]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span
              className={
                i === crumbs.length - 1
                  ? "text-foreground font-medium truncate max-w-[220px]"
                  : "truncate max-w-[160px]"
              }
            >
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
