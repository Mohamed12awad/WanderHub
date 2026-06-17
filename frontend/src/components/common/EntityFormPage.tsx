import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppBreadcrumb, Crumb } from "@/components/common/AppBreadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

interface EntityFormPageProps {
  title: ReactNode;
  backHref: string;
  actions?: ReactNode;
  /**
   * Explicit breadcrumb trail. Omit to derive it from the route
   * `handle.crumb` chain (e.g. "Customers › New").
   */
  breadcrumb?: Crumb[];
  children: ReactNode;
}

/**
 * Uniform shell for every create / edit page.
 * Provides consistent padding, max-width, back-link, and card structure
 * so no page needs to hand-roll `<main><Card><CardHeader>`.
 */
export function EntityFormPage({
  title,
  backHref,
  actions,
  breadcrumb,
  children,
}: EntityFormPageProps) {
  const auto = useBreadcrumbs();
  const trail = breadcrumb ?? auto;
  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="min-w-0">
            {trail.length > 0 && <AppBreadcrumb crumbs={trail} />}
            <CardTitle className="flex items-center gap-3 text-base">
              <Link to={backHref} aria-label="Go back">
                <CircleArrowLeft className="h-5 w-5" />
              </Link>
              {title}
            </CardTitle>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
