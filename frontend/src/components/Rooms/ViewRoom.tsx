import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getRoomById } from "@/utils/api";
import { Link, useParams } from "react-router-dom";
import { CircleArrowLeft, Edit } from "lucide-react";
import { Button } from "../ui/button";
import LoadingSpinner from "../common/spinner";

// Define the Room type based on the schema
type Room = {
  roomNumber: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
};

const ViewRoom: React.FC = () => {
  const [roomData, setRoomData] = useState<Room | null>(null);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;

    const fetchRoomData = async () => {
      try {
        const { data } = await getRoomById(id);
        setRoomData(data);
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };
    fetchRoomData();
  }, [id]);

  if (!roomData) {
    return <LoadingSpinner loading={!roomData} />;
  }

  return (
    <main className="p-4">
      <LoadingSpinner loading={!roomData} />
      <Card>
        <CardHeader className="flex flex-row justify-between">
          <CardTitle className="flex items-center space-x-3">
            <Link to="/rooms">
              <CircleArrowLeft className="text-xl" />
            </Link>
            <span>View Room</span>
          </CardTitle>

          <Link to={`/rooms/${id}/edit`}>
            <Button size="sm" className="h-8 gap-1 px-5">
              <Edit className="h-3.5 w-3.5 me-1" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Room Information</h2>
              <InfoItem label="Room Number" value={roomData.roomNumber} />
              <InfoItem label="Type" value={roomData.type} />
              <InfoItem label="Capacity" value={roomData.capacity} />
              <InfoItem label="Location" value={roomData.location} />
              <InfoItem label="Notes" value={roomData.notes} />
            </section>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

const InfoItem: React.FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div className="mb-3 grid grid-cols-2">
    <Label className="block text-sm font-medium text-gray-700">{label}</Label>
    <p className="mt-1 text-base text-gray-900">{value}</p>
  </div>
);

export default ViewRoom;
