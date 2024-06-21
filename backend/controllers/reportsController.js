const Booking = require("../models/bookingModel");
const PartialPayment = require("../models/partialPaymentModel");
const Purchase = require("../models/purchaseModel");
const Expense = require("../models/expensesModel");
const pug = require("pug");

exports.getAccountingReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const bookings = await Booking.find({
      createdAt: { $gte: start, $lte: end },
    })
      .populate("customer")
      .populate("room");

    const payments = await PartialPayment.find({
      date: { $gte: start, $lte: end },
    }).populate("booking");

    const purchases = await Purchase.find({
      createdAt: { $gte: start, $lte: end },
    });

    const expenses = await Expense.find({
      date: { $gte: start, $lte: end },
    });

    // Compile Pug template to HTML
    const html = pug.renderFile("./accounting-report-template.pug", {
      startDate,
      endDate,
      bookings,
      payments,
      purchases,
      expenses,
    });

    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
