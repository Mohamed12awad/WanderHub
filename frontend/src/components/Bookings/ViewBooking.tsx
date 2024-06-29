import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { getBookingById, deletePayment } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit, Printer } from "lucide-react";
import PaymentRow from "./PaymentsRow";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { PaymentDialog } from "../common/PaymentDialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";
import Invoice from "../common/Invoice";

interface BookingData {
  _id: string;
  customer: string;
  room: string;
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  totalPaid: number;
  status: string;
  numberOfPeople: number;
  bookingLocation: string;
  extraBusSeats: number;
  notes: string;
  createdAt: string;
}
interface PaymentData {
  _id: string;
  amount: number;
  currency: string;
  date: string;
  method: string;
  createdAt: Date;
  createdBy: {
    name: string;
  };
  notes: string;
}

const ViewBooking = () => {
  const queryClient = useQueryClient();
  const {
    data: bookingData,
    isLoading,
    error,
  } = useQuery("bookings", () => getBookingById(bookingId!));
  // console.log(isLoading, error);
  // console.log(bookingData);

  const { id: bookingId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<BookingData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  // deletePayment

  const mutation = useMutation(deletePayment, {
    onSuccess: () => {
      queryClient.invalidateQueries("bookings");
    },
  });

  const handleDelete = async (id: string) => {
    mutation.mutate(id);
  };

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        if (!bookingData?.data) {
          // console.error("Booking data is undefined");
          return;
        }
        const data = bookingData?.data.bookings;
        setPayments(bookingData?.data.payments);
        // console.log(bookingData);
        setFormData({
          ...data,
          customer: data.customer.name,
          room: data.room.roomNumber,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          price: Number(data.price),
          totalPaid: Number(data.totalPaid),
          numberOfPeople: Number(data.numberOfPeople),
          extraBusSeats: Number(data.extraBusSeats),
        });
      } catch (error) {
        console.error("Error fetching booking data:", error);
      }
    };

    fetchBookingData();
  }, [bookingId, bookingData]);

  if (!formData) {
    return <LoadingSpinner loading={!formData} />;
  }

  if (error) {
    return <div>Error loading Bookings</div>;
  }
  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card className="print:hidden">
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center space-x-3">
            <Link to="/bookings">
              <CircleArrowLeft className="me-3" />
            </Link>
            View Booking
          </CardTitle>
          <div className="buttons md:gap-x-3 gap-x-1 flex">
            <Link to={`/bookings/${bookingId}/edit`}>
              <Button size="sm" className="h-8 md:gap-1 md:px-5 px-3">
                <Edit className="h-3.5 w-3.5 me-1" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Edit
                </span>
              </Button>
            </Link>
            <PaymentDialog id={formData._id} />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 md:gap-1 md:px-5 px-3"
              onClick={() => print()}
            >
              <Printer className="h-3.5 w-3.5 me-1" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Invoice
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Booking Information
              </h2>
              <div className="grid grid-cols-2">
                <Label className="my-3">Customer</Label>
                <p>{formData.customer}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Room</Label>
                <p>{formData.room}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Start Date</Label>
                <p>{formData.startDate.toISOString().split("T")[0]}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">End Date</Label>
                <p>{formData.endDate.toISOString().split("T")[0]}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Price</Label>
                <p>{formData.price}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Total Paid</Label>
                <p>{formData.totalPaid}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Number of People</Label>
                <p>{formData.numberOfPeople}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Extra Bus Seats</Label>
                <p>{formData.extraBusSeats}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Notes</Label>
                <p>{formData.notes}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Other Information</h2>
              <div className="grid grid-cols-2">
                <Label className="my-3">Status</Label>
                <p>{formData.status}</p>
              </div>
              <div className="grid grid-cols-2">
                <Label className="my-3">Booking Location</Label>
                <p>{formData.bookingLocation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-5 print:hidden">
        <CardContent className="py-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">
                  Payment No.
                </TableHead>
                <TableHead>Amount Recived</TableHead>
                <TableHead className="hidden md:table-cell">Currency</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">
                  Created By
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments &&
                payments?.map((item: PaymentData, index: number) => (
                  <PaymentRow
                    key={index}
                    name={(index + 1).toString()}
                    state={new Date(item.date).toISOString().split("T")[0]}
                    totalSales={item.amount.toString()}
                    // date={new Date(item.createdAt).toLocaleString()}
                    date={item.currency}
                    method={item.method}
                    price={item.createdBy?.name}
                    id={item._id}
                    handleDelete={handleDelete}
                  />
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Invoice payments={payments} booking={formData} />
    </main>
  );
};

export default ViewBooking;
