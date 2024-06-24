import React, { useState } from "react";
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
import { createBooking, getCustomers, getRooms } from "@/utils/api";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { CircleArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { ErrorResponse, Customer, Room, BookingData } from "@/types/types";
import LoadingSpinner from "../common/spinner";

const initialFormData = {
  customer: "",
  room: "",
  startDate: "",
  endDate: "",
  price: "",
  currency: "EGP",
  totalPaid: "0",
  status: "booked",
  numberOfPeople: "",
  bookingLocation: "",
  extraBusSeats: "",
  notes: "",
};
interface FormErrors {
  customer?: string;
  room?: string;
  startDate?: string;
  endDate?: string;
  price?: string;
  totalPaid?: string;
  numberOfPeople?: string;
  bookingLocation?: string;
}
const AddBooking = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const { data: customers } = useQuery("customers", getCustomers);
  const { data: rooms } = useQuery("rooms", getRooms);
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.customer) newErrors.customer = "Customer is required";
    if (!formData.room) newErrors.room = "Room is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    if (!formData.price) newErrors.price = "Price is required";
    if (Number(formData.price) < 0) newErrors.price = "Price Can't be 0";
    if (!formData.totalPaid) newErrors.totalPaid = "Total paid is required";
    if (!formData.numberOfPeople)
      newErrors.numberOfPeople = "Number of people is required";
    if (!formData.bookingLocation)
      newErrors.bookingLocation = "Booking location is required";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formValidationErrors = validateForm();
    if (Object.keys(formValidationErrors).length > 0) {
      setErrors(formValidationErrors);
      return;
    }

    const bookingData: BookingData = {
      ...formData,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      price: Number(formData.price),
      totalPaid: Number(formData.totalPaid),
      numberOfPeople: Number(formData.numberOfPeople),
      extraBusSeats: Number(formData.extraBusSeats),
    };

    try {
      setIsLoading(true);
      await createBooking(bookingData);
      setIsLoading(false);
      navigate("/bookings");
    } catch (error) {
      setIsLoading(false);
      console.error("Error adding booking:", error);

      const axiosError = error as AxiosError<ErrorResponse>;
      const errMsg = axiosError.response?.data?.message;
      console.error("Error creating user:", errMsg);
      alert(errMsg);
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex">
            <Link to="/bookings">
              <CircleArrowLeft className="me-3" />
            </Link>
            Add Booking
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
                    setFormData((prev) => ({ ...prev, customer: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
                    {customers?.data.map((customer: Customer) => (
                      <SelectItem
                        key={customer._id}
                        value={
                          typeof customer._id !== "undefined"
                            ? customer._id
                            : "N/A"
                        }
                      >
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer && (
                  <span className="text-red-500">{errors.customer}</span>
                )}
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="room">
                  Room
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, room: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
                    {rooms?.data.map((room: Room) => (
                      <SelectItem key={room._id} value={room._id}>
                        {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.room && (
                  <span className="text-red-500">{errors.room}</span>
                )}
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="startDate">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
                {errors.startDate && (
                  <span className="text-red-500">{errors.startDate}</span>
                )}
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="endDate">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
                {errors.endDate && (
                  <span className="text-red-500">{errors.endDate}</span>
                )}
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
                {errors.price && (
                  <span className="text-red-500">{errors.price}</span>
                )}
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="totalPaid">
                  Total Paid
                </Label>
                <Input
                  id="totalPaid"
                  name="totalPaid"
                  value={formData.totalPaid}
                  onChange={handleChange}
                  required
                />
                {errors.totalPaid && (
                  <span className="text-red-500">{errors.totalPaid}</span>
                )}
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
                {errors.numberOfPeople && (
                  <span className="text-red-500">{errors.numberOfPeople}</span>
                )}
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
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="notes">
                  Notes
                </Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Other Information</h2>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="status">
                  Status
                </Label>
                <Select
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col">
                <Label className="my-3" htmlFor="bookingLocation">
                  Booking Location
                </Label>
                <Select
                  required
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, bookingLocation: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Booking Location" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto max-h-[10rem]">
                    <SelectItem value="Matrouh">Matrouh</SelectItem>
                    <SelectItem value="Cairo">Cairo</SelectItem>
                    <SelectItem value="Luxor">Luxor</SelectItem>
                    <SelectItem value="hurghada">Hurghada</SelectItem>
                    <SelectItem value="Sharm El Sheikh">
                      Sharm El Sheikh
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.bookingLocation && (
                  <span className="text-red-500">{errors.bookingLocation}</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddBooking;
