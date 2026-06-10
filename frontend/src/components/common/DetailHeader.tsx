import { Fragment, ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppBreadcrumb, Crumb } from "@/components/common/AppBreadcrumb";

export interface DetailMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  separatorBefore?: boolean;
}

interface DetailHeaderProps {
  crumbs: Crumb[];
  title: ReactNode;
  /** Status / approval badges shown next to the title. */
  badges?: ReactNode;
  /** The single, state-dependent primary action button. */
  primaryAction?: ReactNode;
  /** Secondary actions collapsed into the ⋮ overflow menu. */
  menuItems?: DetailMenuItem[];
}

/**
 * Unified detail-page header: breadcrumb above the title, a single primary
 * action, and an overflow (⋮) menu for everything else. Replaces the cramped
 * back-arrow-beside-title pattern.
 */
export function DetailHeader({
  crumbs,
  title,
  badges,
  primaryAction,
  menuItems = [],
}: DetailHeaderProps) {
  return (
    <div className="space-y-2">
      <AppBreadcrumb crumbs={crumbs} />
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {badges}
        </div>
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
      </div>
    </div>
  );
}
