import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import UserActions from "./UserActions";
import UserDialog from "./UserDialog";
import { deleteUser, getUsers } from "@/utils/api";
import { User } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";

const USER_FILTERS = [
  { label: "Phone", field: "phone", type: "text" as const },
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Users() {
  const { tr, formatDate } = useLanguage();
  const u = tr.users;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openAdd = () => { setEditId(null); setDialogOpen(true); };
  const openEdit = (id: string) => { setEditId(id); setDialogOpen(true); };

  return (
    <>
      <GenericTable<User>
        queryKey="users"
        fetchData={({ page, limit, q, filters, sort, dir }) => getUsers({ page, limit, q, ...(sort ? { sort, dir } : {}), ...filters })}
        deleteData={deleteUser}
        columns={[
          { id: "name", header: u.headers[0], kind: "text", hideable: false, cell: (item) => <span className="font-medium">{item.name}</span> },
          { id: "email", header: u.headers[1], kind: "text", cell: (item) => <span className="text-foreground/70">{item.email}</span> },
          { id: "role", header: u.headers[2], kind: "text", cell: (item) => <span className="text-foreground/70 capitalize">{item.role?.name ?? "—"}</span> },
          {
            id: "status",
            header: u.headers[3],
            kind: "status",
            cell: (item) => (
              <Badge
                variant="outline"
                className={item.active
                  ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                  : "bg-slate-400 text-white border-slate-400 dark:bg-slate-600 dark:border-slate-600"}
              >
                {item.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            id: "createdAt",
            header: u.headers[4],
            kind: "date",
            cell: (item) => <span className="text-muted-foreground text-xs tabular-nums">{formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>,
          },
        ]}
        onRowClick={(item) => openEdit(item._id)}
        renderActions={(item, handleDelete) => (
          <UserActions
            id={item._id}
            active={item.active}
            handleDelete={handleDelete}
            onEdit={openEdit}
          />
        )}
        quickStatusFilter={{
          field: "active",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        }}
        title={u.title}
        description={u.description}
        addLink="/users/add"
        addLabel={u.add}
        onAdd={openAdd}
        emptyMessage={u.empty}
        noSearchMessage={u.noSearch}
        filterConfigs={USER_FILTERS}
        module="users"
      />

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editId={editId}
      />
    </>
  );
}
