const mongoose = require("mongoose");

const roomPriceSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  price: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
});

const RoomPrice = mongoose.model("RoomPrice", roomPriceSchema);
module.exports = RoomPrice;
