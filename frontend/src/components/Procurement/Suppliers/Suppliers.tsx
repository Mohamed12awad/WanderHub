import { GenericTable } from "@/components/common/GenericTable";
import SupplierRow from "./SupplierRow";
import { deleteSupplier, getSuppliers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Supplier } from "@/types/types";
import type { FilterConfig } from "@/components/common/GenericTable";

const SUPPLIER_FILTERS: FilterConfig[] = [
  { label: "Created Date", field: "createdAt", type: "date-range" },
];

export default function Suppliers() {
  const { tr } = useLanguage();
  const s = tr.suppliers;

  return (
    <GenericTable<Supplier>
      queryKey="suppliers"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getSuppliers({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteSupplier}
      headers={s.headers}
      sortableHeaders={["Name", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "active", label: s.active || "Active" },
          { value: "inactive", label: s.inactive || "Inactive" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <SupplierRow
          key={item._id}
          supplier={item}
          handleDelete={handleDelete}
        />
      )}
      title={s.title}
      description={s.description}
      addLink="/procurement/suppliers/add"
      addLabel={s.add}
      filterConfigs={SUPPLIER_FILTERS}
    />
  );
}
