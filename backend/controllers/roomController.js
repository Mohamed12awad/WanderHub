// controllers/roomController.js
const Room = require("../models/roomModel");

// Controller functions
exports.getRooms = async (req, res) => {
  const rooms = await Room.find({});
  // console.log(rooms);
  if (!rooms) {
    return res.status(404).json({ message: "Rooms not found" });
  }
  res.status(200).json(rooms);
};

exports.getRoomById = (req, res) => {
  const roomId = parseInt(req.params.id);
  const room = Room.find((room) => room.id === roomId);
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.status(200).json(room);
};

exports.createRoom = async (req, res) => {
  // const { roomNumber, capacity, price } = req.body;
  // const id = Room.length + 1;
  // const newRoom = { roomNumber, name, capacity, price };
  // Room.push(newRoom);
  const room = new Room(req.body);
  await room.save();
  res.status(201).json(room);
};

exports.updateRoom = (req, res) => {
  const roomId = parseInt(req.params.id);
  const { name, capacity, price } = req.body;
  let updatedRoom = Room.find((room) => room.id === roomId);
  if (!updatedRoom) {
    return res.status(404).json({ message: "Room not found" });
  }
  updatedRoom.name = name;
  updatedRoom.capacity = capacity;
  updatedRoom.price = price;
  res.json(updatedRoom);
};

exports.deleteRoom = (req, res) => {
  const roomId = parseInt(req.params.id);
  Room = Room.filter((room) => room.id !== roomId);
  res.status(204).end();
};
