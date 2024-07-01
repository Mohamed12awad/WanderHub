import React, { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom } from "@/utils/api"; // Make sure you have an API utility to handle room creation
import { Link, useNavigate } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialFormData = {
  roomNumber: "",
  type: "",
  capacity: "",
  location: "",
  notes: "",
};

interface FormErrors {
  roomNumber?: string;
  type?: string;
  capacity?: string;
  location?: string;
}

const AddRoom = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    if (!formData.roomNumber) newErrors.roomNumber = "Room number is required";
    if (!formData.type) newErrors.type = "Room type is required";
    if (!formData.capacity) newErrors.capacity = "Room capacity is required";
    if (!formData.location) newErrors.location = "Room location is required";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formValidationErrors = validateForm();
    if (Object.keys(formValidationErrors).length > 0) {
      setErrors(formValidationErrors);
      return;
    }

    const roomData = {
      ...formData,
      capacity: Number(formData.capacity),
    };

    try {
      setIsLoading(true);
      await createRoom(roomData); // API call to create the room
      setIsLoading(false);
      navigate("/rooms"); // Navigate to the rooms list page after successful creation
    } catch (error) {
      setIsLoading(false);
      console.error("Error adding room:", error);
      alert("There was an error adding the room. Please try again.");
    }
  };

  return (
    <main className="p-4">
      <LoadingSpinner loading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="flex">
            <Link to="/rooms">
              <CircleArrowLeft className="me-3" />
            </Link>
            Add Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="roomNumber">
                Room Number
              </Label>
              <Input
                id="roomNumber"
                name="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                required
              />
              {errors.roomNumber && (
                <span className="text-red-500">{errors.roomNumber}</span>
              )}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="type">
                Room Type
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Room Type" />
                </SelectTrigger>
                <SelectContent className="overflow-y-auto max-h-[10rem]">
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="trible">Trible</SelectItem>
                  <SelectItem value="quadrable">Quadrable</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <span className="text-red-500">{errors.type}</span>
              )}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="capacity">
                Capacity
              </Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleChange}
                required
              />
              {errors.capacity && (
                <span className="text-red-500">{errors.capacity}</span>
              )}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="location">
                Location
              </Label>
              <Select
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, location: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent className="overflow-y-auto max-h-[10rem]">
                  <SelectItem value="Marsa Matruh">Marsa Matruh</SelectItem>
                  <SelectItem value="Luxor">Luxor</SelectItem>
                  <SelectItem value="Sharm Elshekh">Sharm Elshekh</SelectItem>
                  <SelectItem value="Cairo">Cairo</SelectItem>
                  <SelectItem value="Hurghada">Hurghada</SelectItem>
                </SelectContent>
              </Select>
              {errors.location && (
                <span className="text-red-500">{errors.location}</span>
              )}
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="notes">
                Notes
              </Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="border-[hsl('214.3 31.8% 91.4%')] border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Room"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default AddRoom;
