import { useQuery } from "@tanstack/react-query";
import { getApprovalSettings } from "@/utils/api";

export interface ApprovalConfig {
  module: string;
  approverRoles: string[];
  enabled: boolean;
}

export function useApprovalConfig() {
  const { data } = useQuery({
    queryKey: ["approvalSettings"],
    queryFn: async () => (await getApprovalSettings()).data ?? [],
    staleTime: 5 * 60 * 1000
  });

  const configs = data ?? [];

  const isApprovalEnabled = (module: string): boolean => {
    const cfg = configs.find((c: any) => c.module === module);
    return cfg?.enabled ?? false;
  };

  const canUserApprove = (module: string, userRole: string, userPermissions: string[] = []): boolean => {
    const cfg = configs.find((c: any) => c.module === module);
    if (!cfg?.enabled) return false;
    if (userPermissions.includes('*')) return true;
    if (!cfg.approverRoles?.length) return true;
    return cfg.approverRoles.includes(userRole);
  };

  return { configs, isApprovalEnabled, canUserApprove };
}
