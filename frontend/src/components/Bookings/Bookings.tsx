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
import BookingRow from "./BookingRow";
import { deleteBooking, getBookings, downloadInvoice } from "@/utils/api";
import { Link } from "react-router-dom";

type Booking = {
  _id: string;
  name: string;
  customer: {
    name: string;
  };
  room: {
    roomNumber: string;
  };
  phone: string;
  bookingLocation: string;
  status: string;
  createdAt: string;
  handleDelete: (id: string) => void;
  handleDownload: (id: string) => void;
};

export function Bookings() {
  const queryClient = useQueryClient();
  const {
    data: Bookings,
    isLoading,
    error,
  } = useQuery("bookings", getBookings);

  const {
    mutate: download,
    isLoading: downloadLoading,
    isError: isDownloadError,
    error: downloadError,
  } = useMutation(downloadInvoice);

  // console.log(Bookings?.data);

  const mutation = useMutation(deleteBooking, {
    onSuccess: () => {
      queryClient.invalidateQueries("bookings"); // Invalidate and refetch the 'customers' query
    },
  });

  const handleDelete = async (id: string) => {
    mutation.mutate(id);
  };
  // console.log(customers?.data);
  if (isLoading || downloadLoading) return <div>Loading...</div>;
  if (error || downloadError) return <div>Error loading Bookings</div>;
  if (error || isDownloadError) return <div>Error loading Bookings</div>;

  const bookingsData = Array.isArray(Bookings?.data) ? Bookings.data : [];

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
            <Link to="/bookings/add">
              <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Booking
                </span>
              </Button>
            </Link>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                Manage your Bookings and view their Status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Location
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Room</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Created at
                    </TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookingsData &&
                    bookingsData.map((item: Booking, index: number) => (
                      <BookingRow
                        key={index}
                        name={item.customer.name}
                        state={item.status}
                        price={item.room.roomNumber}
                        totalSales={item.bookingLocation}
                        date={new Date(item.createdAt).toLocaleString()}
                        id={item._id}
                        handleDelete={handleDelete}
                        handleDownload={download}
                      />
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
