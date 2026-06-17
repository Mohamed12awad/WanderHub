import { GenericTable } from "@/components/common/GenericTable";
import SupplierRow from "./SupplierRow";
import { deleteSupplier, getSuppliers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Supplier } from "@/types/types";
import type { FilterConfig } from "@/components/common/GenericTable";
import { useMemo } from "react";

export default function Suppliers() {
  const { tr } = useLanguage();
  const s = tr.suppliers;
  const filters = useMemo<FilterConfig[]>(
    () => [{ label: tr.common.createdDate, field: "createdAt", type: "date-range" }],
    [tr],
  );
  const statusOptions = useMemo(
    () => [
      { value: "active", label: s.active },
      { value: "inactive", label: s.inactive },
    ],
    [s],
  );

  return (
    <GenericTable<Supplier>
      queryKey="suppliers"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getSuppliers({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteSupplier}
      headers={s.headers}
      sortableHeaders={[tr.common.name, tr.common.created]}
      quickStatusFilter={{
        field: "status",
        options: statusOptions,
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
      filterConfigs={filters}
      module="suppliers"
      importConfig={{ entity: "suppliers", title: "Suppliers", permission: "suppliers:create" }}
      exportConfig={{ entity: "suppliers", filename: "suppliers" }}
      bulkConfig={{
        entity: "suppliers",
        statusOptions: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ],
      }}
    />
  );
}
