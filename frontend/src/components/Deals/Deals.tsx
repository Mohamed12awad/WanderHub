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

export function Deals() {
  const { tr } = useLanguage();
  const d = tr.deals;

  return (
    <GenericTable<Deal>
      queryKey="deals"
      fetchData={getDeals}
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
