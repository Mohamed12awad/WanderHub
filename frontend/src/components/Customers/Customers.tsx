import { GenericTable } from "@/components/common/GenericTable";
import CustomerRow from "./customerRow";
import { deleteCustomer, getCustomers } from "@/utils/api";

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
  return (
    <GenericTable<Customer>
      queryKey="customers"
      fetchData={getCustomers}
      deleteData={deleteCustomer}
      headers={["Name", "Status", "Phone", "Location", "Created at"]}
      renderRow={(item) => (
        <CustomerRow
          key={item._id}
          name={item.name}
          state={item.status}
          price={item.phone}
          totalSales={item.location}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={deleteCustomer}
        />
      )}
      title="Customers"
      description="Manage your Customers and view their performance."
      addLink="/customers/add"
    />
  );
}
