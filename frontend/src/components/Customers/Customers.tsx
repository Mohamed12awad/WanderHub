import { useMemo } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import CustomerRow from "./customerRow";
import { deleteCustomer, getCustomers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  createdAt: string;
};

export function Customers() {
  const { tr } = useLanguage();
  const c = tr.contacts;

  const CUSTOMER_FILTERS = useMemo(() => [
    {
      label: c.filters.gender,
      field: "gender",
      type: "select" as const,
      options: [
        { value: "male",   label: c.filters.male },
        { value: "female", label: c.filters.female },
        { value: "other",  label: c.filters.other },
      ],
    },
    { label: c.filters.phone,       field: "phone",     type: "text" as const },
    { label: c.filters.createdDate, field: "createdAt", type: "date-range" as const },
  ], [c]);

  return (
    <GenericTable<Customer>
      queryKey="customers"
      fetchData={({ page, limit, q, filters, sort, dir }) =>
        getCustomers({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })
      }
      deleteData={deleteCustomer}
      headers={c.headers}
      sortableHeaders={["Name", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: Object.entries(c.statuses).map(([value, label]) => ({ value, label })),
      }}
      renderRow={(item, handleDelete, selectionCell) => (
        <CustomerRow
          key={item._id}
          item={item}
          handleDelete={handleDelete}
          selectionCell={selectionCell}
        />
      )}
      title={c.title}
      description={c.description}
      addLink="/customers/add"
      addLabel={c.add}
      emptyMessage={c.empty}
      noSearchMessage={c.noSearch}
      filterConfigs={CUSTOMER_FILTERS}
      module="customers"
      importConfig={{ entity: "customers", title: "Contacts", permission: "contacts:create" }}
      dedupConfig={{ entity: "customers", title: "Contacts", permission: "contacts:edit" }}
      bulkConfig={{
        entity: "customers",
        statusOptions: Object.entries(c.statuses).map(([value, label]) => ({ value, label })),
      }}
      exportConfig={{
        entity: "customers",
        filename: "contacts",
        getRow: (c) => ({
          Name: c.name,
          Email: c.email,
          Phone: c.phone,
          Location: c.location,
          Status: c.status,
          "Created At": new Date(c.createdAt).toLocaleDateString(),
        }),
      }}
    />
  );
}
