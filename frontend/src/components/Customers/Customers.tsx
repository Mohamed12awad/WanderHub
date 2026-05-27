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

const CUSTOMER_FILTERS = [
  { label: "Gender", field: "gender", type: "select" as const, options: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ]},
  { label: "Phone", field: "phone", type: "text" as const },
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Customers() {
  const { tr } = useLanguage();
  const c = tr.contacts;

  return (
    <GenericTable<Customer>
      queryKey="customers"
      fetchData={({ page, limit, q, filters, sort, dir }) => getCustomers({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteCustomer}
      headers={c.headers}
      sortableHeaders={["Name", "Created"]}
      quickStatusFilter={{
        field: "status",
        options: [
          { value: "active",   label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "lead",     label: "Lead" },
          { value: "prospect", label: "Prospect" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <CustomerRow
          key={item._id}
          id={item._id}
          name={item.name}
          status={item.status}
          phone={item.phone}
          location={item.location}
          date={new Date(item.createdAt).toLocaleDateString()}
          handleDelete={handleDelete}
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
      exportConfig={{
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
