import { GenericTable } from "@/components/common/GenericTable";
import DealRow from "./DealRow";
import { deleteDeal, getDeals } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Deal {
  _id: string;
  title: string;
  customer: { name: string };
  product?: { name: string };
  status: string;
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
  { label: "Close Date", field: "closeDate", type: "date-range" as const },
];

export function Deals() {
  const { tr } = useLanguage();
  const d = tr.deals;

  return (
    <GenericTable<Deal>
      queryKey="deals"
      fetchData={({ page, limit, q, filters }) => getDeals({ page, limit, q, ...filters })}
      deleteData={deleteDeal}
      headers={d.headers}
      renderRow={(item, handleDelete) => (
        <DealRow
          key={item._id}
          id={item._id}
          title={item.title}
          customer={item.customer?.name ?? "—"}
          status={item.status}
          value={`${item.price?.toLocaleString()} ${item.currency}`}
          date={new Date(item.createdAt).toLocaleDateString()}
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
      exportConfig={{
        filename: "deals",
        getRow: (deal) => ({
          Title: deal.title,
          Customer: deal.customer?.name ?? "",
          Product: deal.product?.name ?? "",
          Status: deal.status,
          Price: deal.price,
          Currency: deal.currency,
          Source: deal.source,
          "Created At": new Date(deal.createdAt).toLocaleDateString(),
        }),
      }}
    />
  );
}
