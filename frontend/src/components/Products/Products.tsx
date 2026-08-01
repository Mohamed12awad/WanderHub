import { GenericTable } from "@/components/common/GenericTable";
import ProductActions from "./ProductActions";
import { deleteProduct, getProducts } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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
  const { tr, formatDate, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const p = tr.products;

  return (
    <GenericTable<Product>
      queryKey="products"
      fetchData={({ page, limit, q, filters, sort, dir }) => getProducts({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
      deleteData={deleteProduct}
      columns={[
        { id: "name", header: p.headers[0], kind: "text", hideable: false, cell: (item) => <span className="font-medium">{item.name}</span> },
        { id: "type", header: p.headers[1], kind: "status", cell: (item) => <Badge variant="outline">{item.type}</Badge> },
        { id: "capacity", header: p.headers[2], kind: "number", cell: (item) => <span className="font-medium">{formatNumber(item.capacity)}</span> },
        { id: "location", header: p.headers[3], kind: "text", cell: (item) => <span className="text-foreground/70 capitalize">{item.location}</span> },
        { id: "createdAt", header: p.headers[4], kind: "date", cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
      ]}
      onRowClick={(item) => navigate(`/products/${item._id}`)}
      renderActions={(item, handleDelete) => <ProductActions id={item._id} handleDelete={handleDelete} />}
      quickStatusFilter={{
        field: "type",
        options: [
          { value: "service",      label: "Service" },
          { value: "physical",     label: "Physical" },
          { value: "digital",      label: "Digital" },
          { value: "subscription", label: "Subscription" },
        ],
      }}
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
