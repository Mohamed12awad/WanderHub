import { useQuery } from "react-query";
import { getApprovalSettings } from "@/utils/api";

export interface ApprovalConfig {
  module: string;
  approverRoles: string[];
  enabled: boolean;
}

export function useApprovalConfig() {
  const { data } = useQuery<ApprovalConfig[]>(
    ["approvalSettings"],
    async () => (await getApprovalSettings()).data ?? [],
    { staleTime: 5 * 60 * 1000 }
  );

  const configs = data ?? [];

  const isApprovalEnabled = (module: string): boolean => {
    const cfg = configs.find((c) => c.module === module);
    return cfg?.enabled ?? false;
  };

  return { configs, isApprovalEnabled };
}
