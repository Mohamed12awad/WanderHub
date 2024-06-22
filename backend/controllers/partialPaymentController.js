const PartialPayment = require("../models/partialPaymentModel");
const Booking = require("../models/bookingModel");
// const generateInvoice = require("../utils/generateInvoice");

exports.getPartialPaymentsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Fetch all partial payments for the given booking
    const partialPayments = await PartialPayment.find({ booking: bookingId });

    if (partialPayments.length === 0) {
      return res
        .status(404)
        .json({ message: "No partial payments found for this booking" });
    }

    res.status(200).json({ partialPayments });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPartialPayment = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the partial payment by ID
    const partialPayment = await PartialPayment.findById(id);

    if (!partialPayment) {
      return res.status(404).json({ message: "Partial payment not found" });
    }

    res.status(200).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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
    const partialPayment = new PartialPayment({
      booking,
      amount,
      date,
      createdBy: req.user.id,
    });
    await partialPayment.save();

    // Update the booking's totalPaid
    bookingToUpdate.totalPaid = newTotalPaid;
    await bookingToUpdate.save();

    // Generate the updated invoice
    // const payments = await PartialPayment.find({ booking });
    // const invoice = await generateInvoice(bookingToUpdate, payments);

    res.status(201).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePartialPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date } = req.body;

    // Fetch the partial payment to be updated
    const partialPayment = await PartialPayment.findById(id);

    if (!partialPayment) {
      return res.status(404).json({ message: "Partial payment not found" });
    }

    // Update the partial payment details
    partialPayment.amount = amount;
    partialPayment.date = date;
    await partialPayment.save();

    // Update the totalPaid amount in the booking
    const bookingToUpdate = await Booking.findById(partialPayment.booking);

    const payments = await PartialPayment.find({
      booking: partialPayment.booking,
    });
    bookingToUpdate.totalPaid = payments.reduce(
      (total, payment) => total + payment.amount,
      0
    );
    await bookingToUpdate.save();

    res.status(200).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePartialPayment = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the partial payment to be deleted
    const partialPayment = await PartialPayment.findByIdAndDelete(id);

    if (!partialPayment) {
      return res.status(404).json({ message: "Partial payment not found" });
    }

    // Remove the partial payment
    // await partialPayment.remove();

    // Update the totalPaid amount in the booking
    const bookingToUpdate = await Booking.findById(partialPayment.booking);

    const payments = await PartialPayment.find({
      booking: partialPayment.booking,
    });
    bookingToUpdate.totalPaid = payments.reduce(
      (total, payment) => total + payment.amount,
      0
    );
    await bookingToUpdate.save();

    res.status(200).json({ message: "Partial payment deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// And so on for other CRUD operations...
