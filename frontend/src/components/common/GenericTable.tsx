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
import { Link } from "react-router-dom";
import LoadingSpinner from "@/components/common/spinner";

type DataItem = {
  _id: string;
  createdAt: string;
  //   handleDelete: (id: string) => void;
};

type GenericTableProps<T extends DataItem> = {
  queryKey: string;
  fetchData: () => Promise<{ data: T[] }>;
  deleteData: (id: string) => Promise<void>;
  headers: string[];
  renderRow: (item: T, handleDelete: (id: string) => void) => JSX.Element;
  title: string;
  description: string;
  addLink: string;
  isDownloadEnabled?: boolean;
};

export function GenericTable<T extends DataItem>({
  queryKey,
  fetchData,
  deleteData,
  headers,
  renderRow,
  title,
  description,
  addLink,
  isDownloadEnabled = false,
}: GenericTableProps<T>) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(queryKey, fetchData);

  const mutation = useMutation(deleteData, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });

  const handleDelete = async (id: string) => {
    mutation.mutate(id);
  };

  if (error) return <div>Error loading data</div>;

  const dataList = Array.isArray(data?.data) ? data?.data : [];

  return (
    <main className="grid flex-1 mt-4 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <LoadingSpinner loading={isLoading} />
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList className="hidden">
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-8 gap-1"
                >
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
            {isDownloadEnabled && (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="h-8 gap-1"
              >
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Export
                </span>
              </Button>
            )}
            <Link to={addLink}>
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add {title}
                </span>
              </Button>
            </Link>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header, index: number) => (
                      <TableHead
                        className={
                          ![0, 2].includes(index) ? `hidden md:table-cell` : ""
                        }
                        key={header}
                      >
                        {header}
                      </TableHead>
                    ))}
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataList.map((item) => renderRow(item, handleDelete))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
