import { useQuery } from "@tanstack/react-query";
import { getOrgSettings } from "@/utils/api";

export interface OrgSettings {
  baseCurrency: string;
  locale: string;
}

const DEFAULTS: OrgSettings = { baseCurrency: "EGP", locale: "en-US" };

export function useOrgSettings(): OrgSettings & { isPending: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["orgSettings"],
    queryFn: async () => (await getOrgSettings()).data,
    staleTime: 10 * 60 * 1000
  });
  return { ...DEFAULTS, ...data, isPending };
}
