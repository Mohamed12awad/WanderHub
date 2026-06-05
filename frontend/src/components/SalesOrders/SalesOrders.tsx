import { GenericTable } from "@/components/common/GenericTable";
import SalesOrderRow from "./SalesOrderRow";
import { deleteSalesOrder, getSalesOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesOrder } from "@/types/types";

export function SalesOrders() {
  const { tr } = useLanguage();
  const s = tr.salesOrders;

  return (
    <GenericTable<SalesOrder>
      queryKey="salesOrders"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getSalesOrders({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteSalesOrder}
      headers={s.headers}
      sortableHeaders={["Order Number", "Total", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "confirmed", label: "Confirmed" },
          { value: "fulfilled", label: "Fulfilled" },
          { value: "invoiced", label: "Invoiced" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <SalesOrderRow key={item._id} order={item} handleDelete={handleDelete} />
      )}
      title={s.title}
      description={s.description}
      addLink="/sales-orders/new"
      addLabel={s.add}
    />
  );
}

export default SalesOrders;
