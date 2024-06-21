const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "EGP" },

    totalPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["booked", "checked-in", "checked-out", "cancelled"],
      default: "booked",
    },
    numberOfPeople: {
      type: Number,
      required: [true, "Please set the number of people"],
    },
    extraBusSeats: {
      type: Number,
      default: 0,
    },
    bookingLocation: {
      type: String,
      required: [true, "Please set the booking location"],
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
