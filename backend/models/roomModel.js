const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  type: { type: String }, // single, double, suite, etc.
  capacity: { type: Number },
  location: { type: String },
});

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;
