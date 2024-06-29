import { GenericTable } from "@/components/common/GenericTable";
import BookingRow from "./BookingRow";
import { deleteBooking, getBookings } from "@/utils/api";

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
};

export function Bookings() {
  return (
    <GenericTable<Booking>
      queryKey="bookings"
      fetchData={getBookings}
      deleteData={deleteBooking}
      headers={["Name", "Location", "Status", "Room", "Created at"]}
      renderRow={(item, handleDelete) => (
        <BookingRow
          key={item._id}
          name={item.customer.name}
          state={item.status}
          price={item.room.roomNumber}
          totalSales={item.bookingLocation}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={handleDelete}
          // handleDownload={downloadInvoice}
        />
      )}
      title="Bookings"
      description="Manage your Bookings and view their Status."
      addLink="/bookings/add"
      isDownloadEnabled={true}
    />
  );
}
