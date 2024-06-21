import { useQuery, useMutation, useQueryClient } from "react-query";
import { File, ListFilter, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserRow from "./UserRow";
import { deleteUser, getUsers } from "@/utils/api";
import { Link } from "react-router-dom";
import { User } from "@/types/types";

export function Users() {
  const queryClient = useQueryClient();
  const { data: Users, isLoading, error } = useQuery("Users", getUsers);

  const mutation = useMutation(deleteUser, {
    onSuccess: () => {
      queryClient.invalidateQueries("Users"); // Invalidate and refetch the 'Users' query
    },
  });
  const handleDelete = async (id: string) => {
    mutation.mutate(id);
  };
  // console.log(Users?.data);
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading Users</div>;

  return (
    <main className="grid flex-1 mt-4 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active" disabled>
              Active
            </TabsTrigger>
            <TabsTrigger value="draft" disabled>
              Draft
            </TabsTrigger>
            <TabsTrigger value="archived" disabled className="hidden sm:flex">
              Archived
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  Active
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Draft</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Archived</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" disabled className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <Link to="/Users/add">
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add User
                </span>
              </Button>
            </Link>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage your Users and view their performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Role</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Created at
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Users?.data.map((item: User, index: number) => (
                    <UserRow
                      key={index}
                      name={item.name}
                      state={item.active ? "Active" : "Inactive"}
                      price={item.email}
                      totalSales={item.role.name}
                      date={new Date(item.createdAt).toLocaleString()}
                      id={item._id}
                      handleDelete={handleDelete}
                    />
                  ))}
                  {/* <CustomerRow
                    name="Laser Lemonade Machine"
                    state="Draft"
                    price="$499.99"
                    totalSales="25"
                    date="2023-07-12 10:42 AM"
                  />
                  <CustomerRow
                    name="Hypernova Headphones"
                    state="Active"
                    price="$129.99"
                    totalSales="100"
                    date="2023-10-18 03:21 PM"
                  /> */}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
