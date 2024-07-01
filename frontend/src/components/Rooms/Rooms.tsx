import { GenericTable } from "@/components/common/GenericTable";
import BookingRow from "./RoomRow";
import { deleteRoom, getRooms } from "@/utils/api";
// import { Room } from "@/types/types";

export interface Room {
  _id: string;
  roomNumber: string;
  type: string;
  capacity: number;
  location: string;
  notes: string;
  createdAt: string;
}

export function Rooms() {
  return (
    <GenericTable<Room>
      queryKey="bookings"
      fetchData={getRooms}
      deleteData={deleteRoom}
      headers={["Room Number", "Location", "Type", "Capacity", "Created At"]}
      renderRow={(item, handleDelete) => (
        <BookingRow
          key={item._id}
          name={item.roomNumber}
          state={item.type}
          price={item.capacity}
          totalSales={item.location}
          date={new Date(item.createdAt).toLocaleString()}
          id={item._id}
          handleDelete={handleDelete}
        />
      )}
      title="Rooms"
      description="Manage your Rooms and view their Status."
      addLink="/rooms/add"
      isDownloadEnabled={false}
    />
  );
}
