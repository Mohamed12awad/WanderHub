import { useMemo } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import CustomerActions from "./CustomerActions";
import { deleteCustomer, getCustomers } from "@/utils/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

type Customer = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  inactive: "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600",
  lead: "bg-sky-500 text-white border-sky-500 dark:bg-sky-600 dark:border-sky-600",
  prospect: "bg-violet-500 text-white border-violet-500 dark:bg-violet-600 dark:border-violet-600",
};

export function Customers() {
  const { tr, formatDate } = useLanguage();
  const navigate = useNavigate();
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
      columns={[
        { id: "name", header: c.headers[0], kind: "text", hideable: false, cell: (item) => <span className="font-medium">{item.name}</span> },
        { id: "status", header: c.headers[1], kind: "status", cell: (item) => <Badge variant="outline" className={`${STATUS_COLORS[item.status] ?? ""} capitalize w-fit`}>{c.statuses?.[item.status] ?? item.status}</Badge> },
        { id: "phone", header: c.headers[2], kind: "text", cell: (item) => <span className="text-foreground/70">{item.phone}</span> },
        { id: "location", header: c.headers[3], kind: "text", cell: (item) => <span className="text-foreground/70 capitalize">{item.location}</span> },
        { id: "createdAt", header: c.headers[4], kind: "date", cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
      ]}
      onRowClick={(item) => navigate(`/customers/${item._id}`)}
      renderActions={(item, handleDelete) => <CustomerActions item={item} handleDelete={handleDelete} />}
      quickStatusFilter={{
        field: "status",
        options: Object.entries(c.statuses).map(([value, label]) => ({ value, label })),
      }}
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
          "Created At": new Date(c.createdAt).toISOString().slice(0, 10),
        }),
      }}
    />
  );
}
