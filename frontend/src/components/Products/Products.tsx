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

export function Products() {
  const { tr } = useLanguage();
  const p = tr.products;

  return (
    <GenericTable<Product>
      queryKey="products"
      fetchData={({ page, limit, q }) => getProducts({ page, limit, q })}
      deleteData={deleteProduct}
      headers={p.headers}
      renderRow={(item, handleDelete) => (
        <ProductRow
          key={item._id}
          id={item._id}
          name={item.name}
          type={item.type}
          capacity={item.capacity}
          location={item.location}
          date={new Date(item.createdAt).toLocaleString()}
          handleDelete={handleDelete}
        />
      )}
      title={p.title}
      description={p.description}
      addLink="/products/add"
      addLabel={p.add}
      emptyMessage={p.empty}
      noSearchMessage={p.noSearch}
    />
  );
}
