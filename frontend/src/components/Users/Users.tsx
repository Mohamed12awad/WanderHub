import { GenericTable } from "@/components/common/GenericTable";
import UserRow from "./UserRow";
import { deleteUser, getUsers } from "@/utils/api";
import { User } from "@/types/types";
import { useLanguage } from "@/contexts/LanguageContext";

export function Users() {
  const { tr } = useLanguage();
  const u = tr.users;

  return (
    <GenericTable<User>
      queryKey="users"
      fetchData={getUsers}
      deleteData={deleteUser}
      headers={u.headers}
      renderRow={(item, handleDelete) => (
        <UserRow
          key={item._id}
          name={item.name}
          state={item.active ? "Active" : "Inactive"}
          price={item.email}
          totalSales={item.role.name}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={handleDelete}
        />
      )}
      title={u.title}
      description={u.description}
      addLink="/users/add"
      addLabel={u.add}
      emptyMessage={u.empty}
      noSearchMessage={u.noSearch}
    />
  );
}
