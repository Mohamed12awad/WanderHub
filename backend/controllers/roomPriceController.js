// controllers/roomPriceController.js
const roomPrices = require("../models/roomPriceModel");
// Example array to simulate room prices
// let roomPrices = [
//   {
//     id: 1,
//     roomId: 1,
//     price: 100,
//     validFrom: "2024-01-01",
//     validUntil: "2024-12-31",
//   },
//   {
//     id: 2,
//     roomId: 2,
//     price: 200,
//     validFrom: "2024-01-01",
//     validUntil: "2024-12-31",
//   },
// Add more room prices as needed
// ];

// Controller functions
exports.getRoomPrices = (req, res) => {
  res.json(roomPrices);
};

exports.getRoomPriceById = (req, res) => {
  const roomPriceId = parseInt(req.params.id);
  const roomPrice = roomPrices.find((price) => price.id === roomPriceId);
  if (!roomPrice) {
    return res.status(404).json({ message: "Room price not found" });
  }
  res.json(roomPrice);
};

exports.createRoomPrice = (req, res) => {
  const { roomId, price, validFrom, validUntil } = req.body;
  const id = roomPrices.length + 1;
  const newRoomPrice = { id, roomId, price, validFrom, validUntil };
  roomPrices.push(newRoomPrice);
  res.status(201).json(newRoomPrice);
};

exports.updateRoomPrice = (req, res) => {
  const roomPriceId = parseInt(req.params.id);
  const { roomId, price, validFrom, validUntil } = req.body;
  let updatedRoomPrice = roomPrices.find((price) => price.id === roomPriceId);
  if (!updatedRoomPrice) {
    return res.status(404).json({ message: "Room price not found" });
  }
  updatedRoomPrice.roomId = roomId;
  updatedRoomPrice.price = price;
  updatedRoomPrice.validFrom = validFrom;
  updatedRoomPrice.validUntil = validUntil;
  res.json(updatedRoomPrice);
};

exports.deleteRoomPrice = (req, res) => {
  const roomPriceId = parseInt(req.params.id);
  roomPrices = roomPrices.filter((price) => price.id !== roomPriceId);
  res.status(204).end();
};
