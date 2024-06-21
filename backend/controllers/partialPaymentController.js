const PartialPayment = require("../models/partialPaymentModel");
const Booking = require("../models/bookingModel");
const generateInvoice = require("../utils/generateInvoice");

exports.createPartialPayment = async (req, res) => {
  try {
    const { booking, amount, date } = req.body;

    // Fetch the booking to get the current totalPaid and price
    const bookingToUpdate = await Booking.findById(booking)
      .populate("customer")
      .populate("room");

    if (!bookingToUpdate) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Calculate the new total paid if this payment is added
    const newTotalPaid = (bookingToUpdate.totalPaid || 0) + amount;

    // Check if the new total paid exceeds the total price
    // console.log(newTotalPaid, bookingToUpdate.price);
    if (newTotalPaid > bookingToUpdate.price) {
      return res
        .status(400)
        .json({ message: "Payment exceeds total invoice amount" });
    }

    // Save the partial payment
    const partialPayment = new PartialPayment({ booking, amount, date });
    await partialPayment.save();

    // Update the booking's totalPaid
    bookingToUpdate.totalPaid = newTotalPaid;
    await bookingToUpdate.save();

    // Generate the updated invoice
    const payments = await PartialPayment.find({ booking });
    const invoice = await generateInvoice(bookingToUpdate, payments);

    res.status(201).json({ partialPayment, invoice });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// And so on for other CRUD operations...
