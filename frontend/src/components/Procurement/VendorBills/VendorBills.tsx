import { GenericTable } from "@/components/common/GenericTable";
import { getVendorBills, deleteVendorBill } from "@/utils/api";
import VendorBillRow from "./VendorBillRow";
import { useLanguage } from "@/contexts/LanguageContext";

export function VendorBills() {
  const { tr } = useLanguage();
  const v = (tr as any).bills;
  const headers = v?.headers ?? ["Bill #", "Supplier", "Status", "Total", "Paid", "Due Date", ""];

  return (
    <GenericTable
      queryKey="vendor-bills"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getVendorBills({ page, limit, q, ...(sort ? { sort, dir } : {}), ...(filters ?? {}) })
      }
      deleteData={deleteVendorBill}
      headers={headers}
      sortableHeaders={["Bill #", "Total"]}
      renderRow={(item: Record<string, unknown>, handleDelete) => (
        <VendorBillRow key={item._id as string} {...(item as any)} handleDelete={handleDelete} />
      )}
      title={v?.title ?? "Vendor Bills"}
      description={v?.description ?? "Track bills and payables to your suppliers."}
      addLink="/procurement/bills/new"
      addLabel={v?.add ?? "Add Bill"}
      module="procurement"
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "draft", label: "Draft" },
          { value: "received", label: "Received" },
          { value: "partially_paid", label: "Partially Paid" },
          { value: "paid", label: "Paid" },
          { value: "overdue", label: "Overdue" },
        ],
      }}
    />
  );
}
