import { useQuery } from "react-query";
import { getOrgSettings } from "@/utils/api";

export interface OrgSettings {
  baseCurrency: string;
  locale: string;
}

const DEFAULTS: OrgSettings = { baseCurrency: "EGP", locale: "en-US" };

export function useOrgSettings(): OrgSettings & { isLoading: boolean } {
  const { data, isLoading } = useQuery<OrgSettings>(
    ["orgSettings"],
    async () => (await getOrgSettings()).data,
    { staleTime: 10 * 60 * 1000 }
  );
  return { ...DEFAULTS, ...data, isLoading };
}
