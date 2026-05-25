import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import { Permission } from "@/config/permissions";

interface Props {
  require: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ require, children, fallback = null }: Props) {
  const allowed = usePermission(require);
  return <>{allowed ? children : fallback}</>;
}
