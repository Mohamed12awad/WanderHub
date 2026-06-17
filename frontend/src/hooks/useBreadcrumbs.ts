import { useMatches } from "react-router-dom";
import type { Crumb } from "@/components/common/AppBreadcrumb";

/** Shape every route's `handle` should follow to contribute a breadcrumb. */
export interface RouteCrumbHandle {
  /** A static label, or a fn of URL params (NO loader data — see plan). */
  crumb?: string | ((params: Record<string, string | undefined>) => string);
}

/**
 * Derives the breadcrumb trail from the active route tree via `useMatches()`
 * (data-router only). Each matched route contributing a `handle.crumb` becomes a
 * crumb whose href is that match's pathname. No path-matching dictionary, no
 * ObjectId regex — the router already knows the hierarchy.
 *
 * For dynamic entity names (e.g. a customer's name), pages pass `crumbsOverride`
 * to PageHeader, which replaces the leaf crumb once its data resolves.
 */
export function useBreadcrumbs(): Crumb[] {
  const matches = useMatches();

  const crumbs: Crumb[] = [];
  for (const match of matches) {
    const handle = match.handle as RouteCrumbHandle | undefined;
    if (!handle?.crumb) continue;

    const label =
      typeof handle.crumb === "function"
        ? handle.crumb(match.params as Record<string, string | undefined>)
        : handle.crumb;
    if (!label) continue;

    // Collapse consecutive duplicates (e.g. a section parent + its index child
    // resolving to the same pathname/label).
    const prev = crumbs[crumbs.length - 1];
    if (prev && prev.label === label) {
      prev.href = match.pathname;
      continue;
    }
    crumbs.push({ label, href: match.pathname });
  }
  return crumbs;
}
