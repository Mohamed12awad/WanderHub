import { GenericTable } from "@/components/common/GenericTable";
import UserRow from "./UserRow";
import { deleteUser, getUsers } from "@/utils/api";
import { User } from "@/types/types";

export function Users() {
  return (
    <GenericTable<User>
      queryKey="users"
      fetchData={getUsers}
      deleteData={deleteUser}
      headers={["Name", "Status", "Email", "Role", "Created at"]}
      renderRow={(item) => (
        <UserRow
          key={item._id}
          name={item.name}
          state={item.active ? "Active" : "Inactive"}
          price={item.email}
          totalSales={item.role.name}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={(id) => deleteUser(id)}
        />
      )}
      title="Users"
      description="Manage your Users and view their performance."
      addLink="/users/add"
    />
  );
}
