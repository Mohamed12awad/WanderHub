import { useMemo } from "react";
import { GenericTable, type FilterConfig } from "@/components/common/GenericTable";
import DealRow from "./DealRow";
import { deleteDeal, getDeals } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

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

export function Deals() {
  const { tr } = useLanguage();
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

  // Sortable columns are referenced by their (translated) header label, matching
  // GenericTable's contract: Title, Value, Created, Priority.
  const sortableHeaders = useMemo(
    () => [d.headers[0], d.headers[5], d.headers[6], d.headers[3]],
    [d],
  );

  return (
    <GenericTable<Deal>
      queryKey="deals"
      fetchData={({ page, limit, q, filters, sort, dir }) => getDeals({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteDeal}
      headers={d.headers}
      sortableHeaders={sortableHeaders}
      renderRow={(item, handleDelete, selectionCell) => (
        <DealRow
          key={item._id}
          id={item._id}
          selectionCell={selectionCell}
          title={item.title}
          customer={item.customer?.name ?? "—"}
          status={item.status}
          priority={item.priority}
          owner={item.owner?.name}
          value={`${item.price?.toLocaleString()} ${item.currency}`}
          date={new Date(item.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          handleDelete={handleDelete}
        />
      )}
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
          [d.exportColumns.createdAt]: new Date(deal.createdAt).toLocaleDateString(),
        }),
      }}
    />
  );
}
