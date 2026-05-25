import { useAuth } from "@/contexts/authContext";
import { Permission } from "@/config/permissions";

export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const perms: string[] = user.permissions ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export function usePermissions(permissions: Permission[]): Record<string, boolean> {
  const { user } = useAuth();
  const perms: string[] = user?.permissions ?? [];
  const hasAll = perms.includes("*");
  return Object.fromEntries(
    permissions.map((p) => [p, hasAll || perms.includes(p)])
  );
}
