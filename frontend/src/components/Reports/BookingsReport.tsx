import React, { useEffect } from "react";
import { Badge } from "../ui/badge";

interface Customer {
  name: string;
  phone: string;
  owner: {
    name: string;
    phone: string;
  };
}

interface Room {
  roomNumber: string;
}

interface Booking {
  _id: string;
  customer: Customer;
  room: Room;
  price: number;
  totalPaid: number;
  status: string;
  startDate: string;
  endDate: string;
  numberOfPeople: number;
  extraBusSeats: number;
  bookingLocation: string;
  notes: string;
}

interface BookingReportProps {
  bookings: Booking[];
}

const BookingReportComponent: React.FC<BookingReportProps> = ({ bookings }) => {
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);
  const renderBooking = (booking: Booking) => (
    <div
      key={booking._id}
      className="p-6 mb-4 print:py-2 print:mb-2 border rounded-lg shadow-sm bg-white"
    >
      <div className="grid print:grid-cols-2 grid-cols-1 md:grid-cols-2 gap-4 print:text-sm">
        <div>
          <h5 className="text-lg print:text-base print:mb-0 font-medium mb-2">
            Customer:{" "}
            <span className="font-normal">{booking.customer.name}</span>
          </h5>
          <p className="mb-1">
            <strong>Phone:</strong> {booking.customer.phone}
          </p>
          <p className="mb-1">
            <strong>Room:</strong> {booking.room.roomNumber}
          </p>
          <p className="mb-1">
            <strong>Start Date:</strong> {booking.startDate.split("T")[0]}
          </p>
          <p className="mb-1">
            <strong>Number Of People:</strong> {booking.numberOfPeople}
          </p>
          {booking.extraBusSeats > 0 && (
            <p className="mb-1">
              <strong>Extra Bus Seats:</strong> {booking.extraBusSeats}
            </p>
          )}
          <p className="mb-1">
            <strong>Owner:</strong> {booking.customer.owner.name} -{" "}
            {booking.customer.owner.phone}
          </p>
        </div>
        <div>
          <p className="mb-1">
            <strong>Total Price:</strong> {booking.price.toLocaleString()} EGP
          </p>
          <p className="mb-1">
            <strong>Remaining:</strong>{" "}
            {(booking.price - booking.totalPaid).toLocaleString()} EGP
          </p>
          <p className="mb-1">
            <strong>Remaining:</strong>{" "}
            {(booking.price - booking.totalPaid).toLocaleString()} EGP
          </p>

          <p className="mb-1">
            <strong>End Date:</strong> {booking.endDate.split("T")[0]}
          </p>
          <p className="mb-1">
            <strong>Booking Location:</strong> {booking.bookingLocation}
          </p>
          {booking.notes != "" && (
            <p className="mb-1">
              <strong>Notes:</strong> {booking.notes}
            </p>
          )}
          {/* <p className="mb-1">
            <strong>Status:</strong> {booking.status}
          </p> */}
        </div>
      </div>
    </div>
  );

  return (
    <div className="booking-report p-6">
      <h1 className="text-2xl font-bold mb-4 items-center flex gap-x-3">
        Booking Report <Badge>{bookings?.length}</Badge>
      </h1>
      {bookings?.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => renderBooking(booking))}
        </div>
      ) : (
        <p className="text-center text-gray-500">No booking data available.</p>
      )}
    </div>
  );
};

export default BookingReportComponent;
