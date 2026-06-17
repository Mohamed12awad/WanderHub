import { Fragment, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppBreadcrumb, type Crumb } from "@/components/common/AppBreadcrumb";
import type { DetailMenuItem } from "@/components/common/DetailHeader";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Status / context badges shown next to the title. */
  badges?: ReactNode;
  /** The single primary action button. Everything else goes in `menuItems`. */
  primaryAction?: ReactNode;
  /** Secondary actions collapsed into the ⋮ overflow menu. */
  menuItems?: DetailMenuItem[];
  /**
   * Replaces the auto-generated breadcrumb trail. Pages with a dynamic leaf
   * (e.g. an entity name only known after a client fetch) pass the full trail
   * here; otherwise breadcrumbs come from the route `handle.crumb` chain.
   */
  crumbsOverride?: Crumb[];
  /** Hide the breadcrumb row entirely (e.g. top-level pages). */
  hideBreadcrumb?: boolean;
  /** Pin the header under the NavBar for long read/table pages. */
  sticky?: boolean;
  className?: string;
}

/**
 * The unified page header for standalone, list, and form pages — same grammar as
 * DetailHeader (breadcrumb → title+badges → one primary action + ⋮ overflow).
 */
export function PageHeader({
  title,
  description,
  badges,
  primaryAction,
  menuItems = [],
  crumbsOverride,
  hideBreadcrumb,
  sticky,
  className,
}: PageHeaderProps) {
  const generated = useBreadcrumbs();
  const crumbs = crumbsOverride ?? generated;
  // A lone crumb just repeats the page title — only show a trail with real depth.
  const showCrumbs = !hideBreadcrumb && crumbs.length > 1;

  return (
    <div
      className={cn(
        "space-y-2",
        sticky &&
          "sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:-mx-6 md:px-6",
        className
      )}
    >
      {showCrumbs && <AppBreadcrumb crumbs={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
            {badges}
          </div>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {(primaryAction || menuItems.length > 0) && (
          <div className="flex shrink-0 items-center gap-2">
            {primaryAction}
            {menuItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems.map((item, i) => (
                    <Fragment key={i}>
                      {item.separatorBefore && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={item.onClick}
                        className={item.destructive ? "text-destructive" : undefined}
                      >
                        {item.icon}
                        {item.label}
                      </DropdownMenuItem>
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
