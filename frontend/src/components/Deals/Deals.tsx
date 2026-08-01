import { useMemo } from "react";
import { GenericTable, type FilterConfig } from "@/components/common/GenericTable";
import DealActions from "./DealActions";
import { deleteDeal, getDeals } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export interface Deal {
  _id: string;
  title: string;
  customer: { name: string };
  category?: string;
  owner?: { name: string };
  status: string;
  priority?: string;
  probability?: number;
  price: number;
  currency: string;
  source: string;
  createdAt: string;
}

const CURRENCY_CODES = ["USD", "EUR", "GBP", "EGP", "AED", "SAR"];

const STATUS_COLORS: Record<string, string> = {
  lead: "bg-sky-500 text-white border-sky-500 dark:bg-sky-600 dark:border-sky-600",
  qualified: "bg-violet-500 text-white border-violet-500 dark:bg-violet-600 dark:border-violet-600",
  proposal: "bg-amber-500 text-white border-amber-500 dark:bg-amber-600 dark:border-amber-600",
  negotiation: "bg-orange-500 text-white border-orange-500 dark:bg-orange-600 dark:border-orange-600",
  won: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  lost: "bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600",
  cancelled: "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-700",
  medium: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  low: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600",
};

export function Deals() {
  const { tr, formatCurrency, formatDate } = useLanguage();
  const navigate = useNavigate();
  const d = tr.deals;

  // Deal statuses reuse the shared pipeline stage labels so the same wording
  // appears everywhere. All config that references `tr` is memoized on `tr` so
  // it rebuilds on language change without reallocating on unrelated renders.
  const statusOptions = useMemo(
    () => ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"]
      .map((value) => ({ value, label: tr.pipeline.stages[value] })),
    [tr],
  );

  const dealFilters = useMemo<FilterConfig[]>(() => [
    { label: d.filters.status, field: "status", type: "select", options: statusOptions },
    { label: d.filters.source, field: "source", type: "select", options: Object.entries(d.sources).map(([value, label]) => ({ value, label })) },
    { label: d.filters.currency, field: "currency", type: "select", options: CURRENCY_CODES.map((c) => ({ value: c, label: c })) },
    { label: d.filters.priority, field: "priority", type: "select", options: Object.entries(d.priorities).map(([value, label]) => ({ value, label })) },
    { label: d.filters.dealValue, field: "price", type: "number-range" },
    { label: d.filters.expectedCloseDate, field: "closeDate", type: "date-range" },
    { label: d.filters.createdDate, field: "createdAt", type: "date-range" },
  ], [d, statusOptions]);

  return (
    <GenericTable<Deal>
      queryKey="deals"
      fetchData={({ page, limit, q, filters, sort, dir }) => getDeals({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteDeal}
      columns={[
        { id: "title", header: d.headers[0], kind: "text", hideable: false, cell: (item) => <span className="font-medium">{item.title}</span> },
        { id: "customer", header: d.headers[1], kind: "text", cell: (item) => <span className="text-foreground/70">{item.customer?.name ?? "—"}</span> },
        { id: "status", header: d.headers[2], kind: "status", cell: (item) => <Badge className={`${STATUS_COLORS[item.status] ?? ""} capitalize w-fit`} variant="outline">{item.status}</Badge> },
        {
          id: "priority",
          header: d.headers[3],
          kind: "status",
          cell: (item) => item.priority ? <Badge className={`${PRIORITY_COLORS[item.priority] ?? ""} capitalize w-fit text-xs`} variant="outline">{item.priority}</Badge> : <span className="text-muted-foreground">—</span>,
        },
        { id: "owner", header: d.headers[4], kind: "text", cell: (item) => <span className="text-foreground/70 text-sm">{item.owner?.name ?? "—"}</span> },
        { id: "value", header: d.headers[5], kind: "number", cell: (item) => <span className="font-medium">{formatCurrency(item.price ?? 0, item.currency)}</span> },
        { id: "createdAt", header: d.headers[6], kind: "date", cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
      ]}
      onRowClick={(item) => navigate(`/deals/${item._id}`)}
      renderActions={(item, handleDelete) => <DealActions id={item._id} handleDelete={handleDelete} />}
      title={d.title}
      description={d.description}
      addLink="/deals/add"
      addLabel={d.add}
      emptyMessage={d.empty}
      noSearchMessage={d.noSearch}
      filterConfigs={dealFilters}
      module="deals"
      importConfig={{ entity: "deals", title: d.title, permission: "deals:create" }}
      bulkConfig={{
        entity: "deals",
        statusOptions,
      }}
      quickStatusFilter={{
        field: "status",
        options: statusOptions,
      }}
      exportConfig={{
        entity: "deals",
        filename: "deals",
        getRow: (deal) => ({
          [d.exportColumns.title]: deal.title,
          [d.exportColumns.customer]: deal.customer?.name ?? "",
          [d.exportColumns.category]: deal.category ?? "",
          [d.exportColumns.status]: deal.status,
          [d.exportColumns.priority]: deal.priority ?? "",
          [d.exportColumns.owner]: deal.owner?.name ?? "",
          [d.exportColumns.price]: deal.price,
          [d.exportColumns.currency]: deal.currency,
          [d.exportColumns.source]: deal.source,
          [d.exportColumns.createdAt]: new Date(deal.createdAt).toISOString().slice(0, 10),
        }),
      }}
    />
  );
}
