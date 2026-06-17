import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import PurchaseOrdersBoard from "./PurchaseOrdersBoard";
import PurchaseOrderRow from "./PurchaseOrderRow";
import { deletePurchaseOrder, getPurchaseOrders } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { PurchaseOrder } from "@/types/types";
import type { FilterConfig } from "@/components/common/GenericTable";

const PO_FILTERS: FilterConfig[] = [
  { label: "Issue Date", field: "issueDate", type: "date-range" },
  { label: "Expected Delivery", field: "expectedDeliveryDate", type: "date-range" },
];

export default function PurchaseOrders() {
  const { tr } = useLanguage();
  const s = tr.purchaseOrders;
  const [view, setView] = useState<"list" | "board">("list");
  const switcher = <ViewSwitch active={view} onChange={setView} />;

  if (view === "board") return <PurchaseOrdersBoard headerExtra={switcher} />;

  return (
    <GenericTable<PurchaseOrder>
      queryKey="purchaseOrders"
      headerExtra={switcher}
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getPurchaseOrders({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deletePurchaseOrder}
      headers={s.headers}
      sortableHeaders={["PO Number", "Total", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "sent", label: "Sent" },
          { value: "confirmed", label: "Confirmed" },
          { value: "received", label: "Received" },
          { value: "cancelled", label: "Cancelled" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <PurchaseOrderRow
          key={item._id}
          po={item}
          handleDelete={handleDelete}
        />
      )}
      title={s.title}
      description={s.description}
      addLink="/procurement/purchase-orders/new"
      addLabel={s.add}
      filterConfigs={PO_FILTERS}
    />
  );
}
