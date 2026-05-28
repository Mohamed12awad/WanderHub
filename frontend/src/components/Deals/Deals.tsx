import { GenericTable } from "@/components/common/GenericTable";
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

const DEAL_FILTERS = [
  {
    label: "Status",
    field: "status",
    type: "select" as const,
    options: [
      { value: "lead", label: "Lead" },
      { value: "qualified", label: "Qualified" },
      { value: "proposal", label: "Proposal" },
      { value: "negotiation", label: "Negotiation" },
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    label: "Source",
    field: "source",
    type: "select" as const,
    options: [
      { value: "website", label: "Website" },
      { value: "referral", label: "Referral" },
      { value: "cold_call", label: "Cold Call" },
      { value: "social_media", label: "Social Media" },
      { value: "other", label: "Other" },
    ],
  },
  {
    label: "Currency",
    field: "currency",
    type: "select" as const,
    options: [
      { value: "USD", label: "USD" },
      { value: "EUR", label: "EUR" },
      { value: "GBP", label: "GBP" },
      { value: "EGP", label: "EGP" },
      { value: "AED", label: "AED" },
      { value: "SAR", label: "SAR" },
    ],
  },
  {
    label: "Priority",
    field: "priority",
    type: "select" as const,
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  { label: "Deal Value", field: "price", type: "number-range" as const },
  { label: "Expected Close Date", field: "closeDate", type: "date-range" as const },
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Deals() {
  const { tr } = useLanguage();
  const d = tr.deals;

  return (
    <GenericTable<Deal>
      queryKey="deals"
      fetchData={({ page, limit, q, filters, sort, dir }) => getDeals({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteDeal}
      headers={d.headers}
      sortableHeaders={["Title", "Value", "Created", "Priority"]}
      renderRow={(item, handleDelete) => (
        <DealRow
          key={item._id}
          id={item._id}
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
      filterConfigs={DEAL_FILTERS}
      module="deals"
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "lead", label: "Lead" },
          { value: "qualified", label: "Qualified" },
          { value: "proposal", label: "Proposal" },
          { value: "negotiation", label: "Negotiation" },
          { value: "won", label: "Won" },
          { value: "lost", label: "Lost" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
      exportConfig={{
        filename: "deals",
        getRow: (deal) => ({
          Title: deal.title,
          Customer: deal.customer?.name ?? "",
          Category: deal.category ?? "",
          Status: deal.status,
          Priority: deal.priority ?? "",
          Owner: deal.owner?.name ?? "",
          Price: deal.price,
          Currency: deal.currency,
          Source: deal.source,
          "Created At": new Date(deal.createdAt).toLocaleDateString(),
        }),
      }}
    />
  );
}
