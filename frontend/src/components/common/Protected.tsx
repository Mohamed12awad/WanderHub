import { ReactNode } from "react";
import { useAuth } from "@/contexts/authContext";
import AccessDenied from "@/pages/AccessDenied";

/**
 * Route guard: renders children only when the user holds `permission`,
 * otherwise shows the Access Denied page. Mirrors the backend PermissionGuard —
 * "*" grants everything and a scoped grant (e.g. "deals:view:own") satisfies the
 * broader requirement ("deals:view").
 */
export function Protected({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const perms: string[] = user?.permissions ?? [];
  const allowed =
    perms.includes("*") ||
    perms.some((p) => p === permission || p.startsWith(`${permission}:`));

  if (!allowed) return <AccessDenied permission={permission} />;
  return <>{children}</>;
}
