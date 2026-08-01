import { useState } from "react";
import { GenericTable } from "@/components/common/GenericTable";
import UserRow from "./UserRow";
import UserDialog from "./UserDialog";
import { deleteUser, getUsers } from "@/utils/api";
import { User } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

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
        headers={u.headers}
        sortableHeaders={["Name", "Created"]}
        quickStatusFilter={{
          field: "active",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ],
        }}
        renderRow={(item, handleDelete) => (
          <UserRow
            key={item._id}
            id={item._id}
            name={item.name}
            email={item.email}
            role={item.role?.name ?? "—"}
            active={item.active}
            date={formatDate(item.createdAt, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            handleDelete={handleDelete}
            onEdit={openEdit}
          />
        )}
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
