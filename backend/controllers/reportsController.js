const Booking = require("../models/bookingModel");
const PartialPayment = require("../models/partialPaymentModel");
const Purchase = require("../models/purchaseModel");
const Expense = require("../models/expensesModel");

const getBookingsReport = async (start, end) => {
  const query = { createdAt: { $gte: start, $lte: end } };
  return Booking.find(query).populate("customer").populate("room");
};

const getBookingsReportByStartAndEndDate = async (start, end, location) => {
  const pipeline = [
    { $match: { startDate: { $gte: start, $lte: end } } },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    {
      $lookup: {
        from: "users", // Assuming 'owners' is the name of the collection where owner data is stored
        localField: "customer.owner",
        foreignField: "_id",
        as: "customer.owner",
      },
    },
    { $unwind: "$customer.owner" },
  ];

  if (location) {
    pipeline.push({ $match: { "customer.location": location } });
  }

  return Booking.aggregate(pipeline).then((results) =>
    Booking.populate(results, { path: "room" })
  );
};

const getPaymentsReport = async (start, end) => {
  return PartialPayment.find({ date: { $gte: start, $lte: end } }).populate(
    "booking"
  );
};

const getPurchasesReport = async (start, end) => {
  return Purchase.find({ createdAt: { $gte: start, $lte: end } });
};

const getExpensesReport = async (start, end) => {
  return Expense.find({ date: { $gte: start, $lte: end } });
};

exports.getAccountingReport = async (req, res) => {
  const { startDate, endDate, location } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Start date and end date are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const [bookings, payments, purchases, expenses] = await Promise.all([
      getBookingsReport(start, end, location),
      getPaymentsReport(start, end),
      getPurchasesReport(start, end),
      getExpensesReport(start, end),
    ]);

    res.status(200).json({ bookings, payments, purchases, expenses });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingReport = async (req, res) => {
  const { startDate, endDate, location } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Start date and end date are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const bookings = await getBookingsReportByStartAndEndDate(
      start,
      end,
      location
    );

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: error.message });
  }
};
