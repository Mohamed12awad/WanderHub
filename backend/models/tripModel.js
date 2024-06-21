const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
});

const tripSchema = new mongoose.Schema({
  busNumber: { type: String, required: true },
  date: { type: Date, required: true },
  seats: [seatSchema],
});

module.exports = mongoose.model("Trip", tripSchema);
