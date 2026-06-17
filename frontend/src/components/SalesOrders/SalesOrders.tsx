import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import SalesOrdersBoard from "./SalesOrdersBoard";
import SalesOrderRow from "./SalesOrderRow";
import { deleteSalesOrder, getSalesOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { SalesOrder } from "@/types/types";

export function SalesOrders() {
  const { tr } = useLanguage();
  const s = tr.salesOrders;
  const [view, setView] = useState<"list" | "board">("list");
  const switcher = <ViewSwitch active={view} onChange={setView} />;

  if (view === "board") return <SalesOrdersBoard headerExtra={switcher} />;

  return (
    <GenericTable<SalesOrder>
      queryKey="salesOrders"
      headerExtra={switcher}
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
