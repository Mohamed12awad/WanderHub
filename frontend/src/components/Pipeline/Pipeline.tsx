import { useQuery, useMutation, useQueryClient } from "react-query";
import { getDeals, updateDeal } from "@/utils/api";
import { Link } from "react-router-dom";
import { DealData } from "@/types/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

interface Deal {
  _id: string;
  title: string;
  customer: { name: string };
  product?: { name: string };
  status: string;
  price: number;
  currency: string;
  createdAt: string;
}

const STATUSES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"] as const;
type DealStatus = (typeof STATUSES)[number];

const STATUS_STYLES: Record<DealStatus, { header: string; card: string }> = {
  lead:        { header: "bg-blue-500",   card: "border-blue-200 hover:border-blue-400" },
  qualified:   { header: "bg-purple-500", card: "border-purple-200 hover:border-purple-400" },
  proposal:    { header: "bg-amber-500",  card: "border-amber-200 hover:border-amber-400" },
  negotiation: { header: "bg-orange-500", card: "border-orange-200 hover:border-orange-400" },
  won:         { header: "bg-emerald-500",card: "border-emerald-200 hover:border-emerald-400" },
  lost:        { header: "bg-red-500",    card: "border-red-200 hover:border-red-400" },
  cancelled:   { header: "bg-slate-400",  card: "border-slate-200 hover:border-slate-400" },
};

export function Pipeline() {
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery("deals", getDeals);

  const moveMutation = useMutation(
    ({ id, status }: { id: string; status: string }) =>
      updateDeal(id, { status } as DealData),
    { onSuccess: () => queryClient.invalidateQueries("deals") }
  );

  const deals: Deal[] = Array.isArray(data?.data) ? data.data : [];

  const grouped = STATUSES.reduce<Record<DealStatus, Deal[]>>(
    (acc, s) => { acc[s] = deals.filter((d) => d.status === s); return acc; },
    {} as Record<DealStatus, Deal[]>
  );

  if (error) return <div className="p-4 text-sm text-destructive">Error loading deals.</div>;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{tr.pipeline.title}</h1>
        <p className="text-sm text-muted-foreground">{tr.pipeline.subtitle}</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map((status) => {
          const style = STATUS_STYLES[status];
          const column = grouped[status];
          const label = tr.pipeline.stages[status] ?? status;

          return (
            <div key={status} className="flex-shrink-0 w-56">
              <div className={`${style.header} text-white rounded-t-xl px-3 py-2 flex justify-between items-center`}>
                <span className="font-semibold text-sm">{label}</span>
                <span className="bg-white/25 rounded-full text-xs px-2 py-0.5 font-medium">
                  {isLoading ? "…" : column.length}
                </span>
              </div>
              <div className="bg-muted/40 dark:bg-muted/20 rounded-b-xl p-2 min-h-[200px] space-y-2">
                {isLoading && Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}

                {!isLoading && column.map((deal) => (
                  <div key={deal._id} className={`bg-background border rounded-xl p-3 transition-colors ${style.card}`}>
                    <Link to={`/deals/${deal._id}`} className="block font-medium text-sm hover:underline mb-1 truncate">
                      {deal.title}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate mb-2">{deal.customer?.name}</p>
                    <p className="text-xs font-semibold mb-2">
                      {deal.price?.toLocaleString()} {deal.currency}
                    </p>
                    <Select
                      value={deal.status}
                      onValueChange={(v) => moveMutation.mutate({ id: deal._id, status: v })}
                    >
                      <SelectTrigger className="h-6 text-xs bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {tr.pipeline.stages[s] ?? s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {!isLoading && column.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-8">
                    {tr.pipeline.empty}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
