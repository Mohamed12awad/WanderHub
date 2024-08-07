import React, { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getBookingById,
  updateBooking,
  getCustomers,
  getRooms,
} from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";

interface Customer {
  _id: string;
  name: string;
}

interface Room {
  _id: string;
  roomNumber: string;
}

interface BookingData {
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
}

const EditBooking = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: customers } = useQuery("customers", getCustomers);
  const { data: rooms } = useQuery("rooms", getRooms);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        let { data } = await getBookingById(bookingId!);
        data = data.bookings;
        setFormData({
          ...data,
          customer: data.customer._id,
          room: data.room._id,
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
  }, [bookingId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData!,
      [name]: value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData!,
      [name]: new Date(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      await updateBooking(bookingId!, formData!);
      setIsLoading(false);
      navigate("/bookings");
    } catch (error) {
      setIsLoading(false);
      console.error("Error updating booking:", error);
    }
  };

  if (!formData) {
    return <LoadingSpinner loading={!formData} />;
  }

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex">
            <Link to="/bookings">
              <CircleArrowLeft className="me-3" />
            </Link>
            Edit Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Booking Information
              </h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="customer">
                  Customer
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev!, customer: value }))
                  }
                  value={formData.customer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {customers?.data.map((customer: Customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="room">
                  Room
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev!, room: value }))
                  }
                  value={formData.room}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    {rooms?.data.map((room: Room) => (
                      <SelectItem key={room._id} value={room._id}>
                        {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="startDate">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate.toISOString().split("T")[0]}
                  onChange={handleDateChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="endDate">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate.toISOString().split("T")[0]}
                  onChange={handleDateChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="price">
                  Price
                </Label>
                <Input
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="totalPaid">
                  Total Paid
                </Label>
                <Input
                  disabled
                  id="totalPaid"
                  name="totalPaid"
                  value={formData.totalPaid}
                  // onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="numberOfPeople">
                  Number of People
                </Label>
                <Input
                  id="numberOfPeople"
                  name="numberOfPeople"
                  value={formData.numberOfPeople}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="extraBusSeats">
                  Extra Bus Seats
                </Label>
                <Input
                  id="extraBusSeats"
                  name="extraBusSeats"
                  value={formData.extraBusSeats}
                  onChange={handleChange}
                />
              </div>
              {/* <div className="flex flex-col">
                <Label className="my-3" htmlFor="notes">
                  Notes
                </Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div> */}
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Other Information</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="status">
                  Status
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev!, status: value }))
                  }
                  value={formData.status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="status">
                  Booking Location
                </Label>
                <Select
                  required
                  value={formData.bookingLocation}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev!,
                      bookingLocation: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Booking Location" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[12rem]">
                    <SelectItem value="Matrouh">Matrouh</SelectItem>
                    <SelectItem value="Cairo">Cairo</SelectItem>
                    <SelectItem value="Luxor">Luxor</SelectItem>
                    <SelectItem value="hurghada">Hurghada</SelectItem>
                    <SelectItem value="Sharm El Sheikh">
                      Sharm El Sheikh
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="method">
                  Currency
                </Label>
                <div className="col-span-3">
                  <Select
                    required
                    value={formData.currency}
                    defaultValue="EGP"
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev!, currency: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent className="overflow-y-auto max-h-[15rem]">
                      <SelectItem value="EGP">EGP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col">
                <Label htmlFor="notes" className="my-3">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev) => ({
                      ...prev!,
                      notes: e.target.value,
                    }))
                  }
                  className="col-span-3 border-[hsl('214.3 31.8% 91.4%')] border rounded-lg"
                />
              </div>
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditBooking;
