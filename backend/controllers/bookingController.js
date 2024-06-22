const Booking = require("../models/bookingModel");
const Customer = require("../models/customerModel");
const PartialPayment = require("../models/partialPaymentModel");
const generateInvoice = require("../utils/generateInvoice");

exports.createBooking = async (req, res) => {
  try {
    const {
      customer: customerId,
      room: roomId,
      startDate,
      endDate,
      totalPaid,
    } = req.body;

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      room: roomId,
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    });

    if (overlappingBooking) {
      return res
        .status(400)
        .json({ message: "Room is already booked for the selected dates" });
    }

    const booking = new Booking(req.body);
    await booking.save();

    const customer = await Customer.findById(customerId);
    if (customer) {
      customer.bookingHistory.push(booking._id);
      await customer.save();
    }

    // Record initial payment if provided
    if (totalPaid && totalPaid > 0) {
      const payment = new PartialPayment({
        booking: booking._id,
        amount: totalPaid,
        date: new Date(),
        createdBy: req.user.id,
      });
      await payment.save();
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name")
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const includePayments = req.query.includePayments === "true";

    const bookings = await Booking.findById(id)
      .populate("customer", "name")
      .populate("room", "roomNumber");

    let payments = [];
    if (includePayments) {
      payments = await PartialPayment.find({
        booking: id,
      }).populate("createdBy", "name");
    }

    res.json({ bookings, payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer")
      .populate("room");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const payments = await PartialPayment.find({ booking: req.params.id });
    // if (!payments) {
    //   return res.status(404).json({ message: "Payments not found" });
    // }

    const pdfBuffer = await generateInvoice(booking, payments);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${booking._id}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit booking
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer: customerId, room: roomId, startDate, endDate } = req.body;

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      _id: { $ne: id },
      room: roomId,
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    });

    if (overlappingBooking) {
      return res
        .status(400)
        .json({ message: "Room is already booked for the selected dates" });
    }

    const booking = await Booking.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update customer's booking history if customer changed
    if (customerId && booking.customer.toString() !== customerId) {
      const previousCustomer = await Customer.findById(booking.customer);
      if (previousCustomer) {
        previousCustomer.bookingHistory.pull(booking._id);
        await previousCustomer.save();
      }

      const newCustomer = await Customer.findById(customerId);
      if (newCustomer) {
        newCustomer.bookingHistory.push(booking._id);
        await newCustomer.save();
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Remove booking from customer's booking history
    const customer = await Customer.findById(booking.customer);
    if (customer) {
      customer.bookingHistory.pull(booking._id);
      await customer.save();
    }

    res.json({ message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
