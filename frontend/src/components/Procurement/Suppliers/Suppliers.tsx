import { GenericTable } from "@/components/common/GenericTable";
import { deleteSupplier, getSuppliers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Supplier } from "@/types/types";
import type { FilterConfig } from "@/components/common/GenericTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RowActions } from "@/components/common/RowActions";

export default function Suppliers() {
  const { tr, formatDate } = useLanguage();
  const navigate = useNavigate();
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
      columns={[
        { id: "name", header: s.headers[0], kind: "text", hideable: false, cell: (supplier) => <span className="font-medium">{supplier.name}</span> },
        { id: "contactName", header: s.headers[1], kind: "text", cell: (supplier) => supplier.contactName || "-" },
        { id: "email", header: s.headers[2], kind: "text", cell: (supplier) => supplier.email || "-" },
        {
          id: "status",
          header: s.headers[3],
          kind: "status",
          cell: (supplier) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
              {supplier.status === "active" ? s.active : s.inactive}
            </span>
          ),
        },
        { id: "createdAt", header: s.headers[4], kind: "date", cell: (supplier) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(supplier.createdAt)}</span> },
      ]}
      onRowClick={(supplier) => navigate(`/procurement/suppliers/${supplier._id}`)}
      renderActions={(supplier, handleDelete) => (
        <RowActions
          viewHref={`/procurement/suppliers/${supplier._id}`}
          editHref={`/procurement/suppliers/${supplier._id}/edit`}
          onDelete={() => handleDelete(supplier._id)}
        />
      )}
      quickStatusFilter={{
        field: "status",
        options: statusOptions,
      }}
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
