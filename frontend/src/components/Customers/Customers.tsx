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

  return (
    <GenericTable<Customer>
      queryKey="customers"
      fetchData={getCustomers}
      deleteData={deleteCustomer}
      headers={c.headers}
      renderRow={(item, handleDelete) => (
        <CustomerRow
          key={item._id}
          name={item.name}
          state={item.status}
          price={item.phone}
          totalSales={item.location}
          date={new Date(item.createdAt).toLocaleDateString()}
          id={item._id}
          handleDelete={handleDelete}
        />
      )}
      title={c.title}
      description={c.description}
      addLink="/customers/add"
      addLabel={c.add}
      emptyMessage={c.empty}
      noSearchMessage={c.noSearch}
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
