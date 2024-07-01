import React, { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoomById, updateRoom } from "@/utils/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleArrowLeft } from "lucide-react";
import LoadingSpinner from "../common/spinner";

interface RoomData {
  roomNumber: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
}

const EditRoom = () => {
  const { id: roomId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const { data } = await getRoomById(roomId!);
        setFormData({
          roomNumber: data.roomNumber,
          type: data.type,
          capacity: data.capacity,
          location: data.location,
          notes: data.notes,
        });
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };

    fetchRoomData();
  }, [roomId]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData!,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData!,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      //   console.log(formData);
      await updateRoom(roomId!, formData!);
      setIsLoading(false);
      navigate("/rooms");
    } catch (error) {
      setIsLoading(false);
      console.error("Error updating room:", error);
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
            <Link to="/rooms">
              <CircleArrowLeft className="me-3" />
            </Link>
            Edit Room
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
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="type">
                Room Type
              </Label>
              <Select
                onValueChange={(value) => handleSelectChange("type", value)}
                value={formData.type}
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
            </div>
            <div className="flex flex-col col-span-2 md:col-span-1">
              <Label className="my-3" htmlFor="location">
                Location
              </Label>
              <Select
                onValueChange={(value) => handleSelectChange("location", value)}
                value={formData.location}
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
                {isLoading ? "Updating..." : "Update Room"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default EditRoom;
