const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const partialPaymentSchema = new Schema({
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
  date: { type: Date, required: true },
});

const PartialPayment = mongoose.model("PartialPayment", partialPaymentSchema);
module.exports = PartialPayment;
