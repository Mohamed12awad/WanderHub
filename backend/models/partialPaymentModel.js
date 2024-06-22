const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const partialPaymentSchema = new Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount can not be less than 1"],
    },
    currency: { type: String, default: "EGP" },
    date: { type: Date, required: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const PartialPayment = mongoose.model("PartialPayment", partialPaymentSchema);
module.exports = PartialPayment;
