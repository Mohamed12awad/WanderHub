import { GenericTable } from "@/components/common/GenericTable";
import ProductRow from "./ProductRow";
import { deleteProduct, getProducts } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Product {
  _id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
  createdAt: string;
}

const PRODUCT_FILTERS = [
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Products() {
  const { tr } = useLanguage();
  const p = tr.products;

  return (
    <GenericTable<Product>
      queryKey="products"
      fetchData={({ page, limit, q, filters, sort, dir }) => getProducts({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteProduct}
      headers={p.headers}
      sortableHeaders={["Name", "Capacity", "Created"]}
      quickStatusFilter={{
        field: "type",
        options: [
          { value: "service",      label: "Service" },
          { value: "physical",     label: "Physical" },
          { value: "digital",      label: "Digital" },
          { value: "subscription", label: "Subscription" },
        ],
      }}
      renderRow={(item, handleDelete) => (
        <ProductRow
          key={item._id}
          id={item._id}
          name={item.name}
          type={item.type}
          capacity={item.capacity}
          location={item.location}
          date={new Date(item.createdAt).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          handleDelete={handleDelete}
        />
      )}
      title={p.title}
      description={p.description}
      addLink="/products/add"
      addLabel={p.add}
      emptyMessage={p.empty}
      noSearchMessage={p.noSearch}
      filterConfigs={PRODUCT_FILTERS}
      module="products"
      importConfig={{ entity: "products", title: "Products", permission: "products:create" }}
      exportConfig={{ entity: "products", filename: "products" }}
      bulkConfig={{ entity: "products" }}
    />
  );
}
