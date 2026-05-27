import { GenericTable } from "@/components/common/GenericTable";
import UserRow from "./UserRow";
import { deleteUser, getUsers } from "@/utils/api";
import { User } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

const USER_FILTERS = [
  { label: "Phone", field: "phone", type: "text" as const },
  { label: "Created Date", field: "createdAt", type: "date-range" as const },
];

export function Users() {
  const { tr } = useLanguage();
  const u = tr.users;

  return (
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
          date={new Date(item.createdAt).toLocaleDateString()}
          handleDelete={handleDelete}
        />
      )}
      title={u.title}
      description={u.description}
      addLink="/users/add"
      addLabel={u.add}
      emptyMessage={u.empty}
      noSearchMessage={u.noSearch}
      filterConfigs={USER_FILTERS}
      module="users"
    />
  );
}
