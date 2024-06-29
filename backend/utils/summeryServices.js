// services/SummeryService.js
const Booking = require("../models/bookingModel");
// const PartialPayment = require("../models/partialPaymentModel");
const Customer = require("../models/customerModel");
const Expense = require("../models/expensesModel");

const getRevenue = async (startDate, endDate) => {
  const payments = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: "$currency",
        totalAmount: { $sum: "$price" },
      },
    },
  ]);
  return payments.reduce((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    return acc;
  }, {});
};

const getNewCustomers = async (startDate, endDate) => {
  const newCustomers = await Customer.countDocuments({
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
  });
  return newCustomers;
};

const getUnderCollection = async (startDate, endDate) => {
  const underCollection = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: "$currency",
        totalDue: { $sum: { $subtract: ["$price", "$totalPaid"] } },
      },
    },
  ]);
  return underCollection.reduce((acc, curr) => {
    acc[curr._id] = curr.totalDue;
    return acc;
  }, {});
};

const getExpenses = async (startDate, endDate) => {
  const totalExpenses = await Expense.aggregate([
    {
      $match: { date: { $gte: new Date(startDate), $lte: new Date(endDate) } },
    },
    { $group: { _id: "$currency", totalAmount: { $sum: "$amount" } } },
  ]);
  const categorizedExpenses = await Expense.aggregate([
    {
      $match: { date: { $gte: new Date(startDate), $lte: new Date(endDate) } },
    },
    {
      $group: {
        _id: { category: "$category", currency: "$currency" },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const expensesByCurrency = totalExpenses.reduce((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    return acc;
  }, {});

  const expensesByCategory = categorizedExpenses.reduce((acc, curr) => {
    const { category, currency } = curr._id;
    if (!acc[currency]) {
      acc[currency] = {};
    }
    acc[currency][category] = curr.totalAmount;
    return acc;
  }, {});

  return {
    total: expensesByCurrency,
    categories: expensesByCategory,
  };
};

const getSummeryData = async (timePeriod) => {
  const now = new Date();
  let currentStartDate, previousStartDate, previousEndDate;

  switch (timePeriod) {
    case "week":
      currentStartDate = new Date(now.setDate(now.getDate() - 7));
      previousStartDate = new Date(now.setDate(now.getDate() - 14));
      previousEndDate = new Date(now.setDate(now.getDate() + 7));
      break;
    case "month":
      currentStartDate = new Date(now.setMonth(now.getMonth() - 1));
      previousStartDate = new Date(now.setMonth(now.getMonth() - 1));
      previousEndDate = new Date(now.setMonth(now.getMonth() + 1));
      break;
    case "quarter":
      currentStartDate = new Date(now.setMonth(now.getMonth() - 3));
      previousStartDate = new Date(now.setMonth(now.getMonth() - 6));
      previousEndDate = new Date(now.setMonth(now.getMonth() + 3));
      break;
    default:
      currentStartDate = new Date(now.setDate(now.getDate() - 30)); // default to last month
      previousStartDate = new Date(now.setDate(now.getDate() - 60));
      previousEndDate = new Date(now.setDate(now.getDate() + 30));
  }
  const currentEndDate = new Date();

  const currentRevenue = await getRevenue(currentStartDate, currentEndDate);
  const previousRevenue = await getRevenue(previousStartDate, previousEndDate);

  const currentNewCustomers = await getNewCustomers(
    currentStartDate,
    currentEndDate
  );
  const previousNewCustomers = await getNewCustomers(
    previousStartDate,
    previousEndDate
  );

  const currentUnderCollection = await getUnderCollection(
    currentStartDate,
    currentEndDate
  );
  const previousUnderCollection = await getUnderCollection(
    previousStartDate,
    previousEndDate
  );

  const currentExpenses = await getExpenses(currentStartDate, currentEndDate);
  const previousExpenses = await getExpenses(
    previousStartDate,
    previousEndDate
  );

  return {
    currentPeriod: {
      startDate: currentStartDate,
      endDate: currentEndDate,
      revenue: currentRevenue,
      newCustomers: currentNewCustomers,
      underCollection: currentUnderCollection,
      expenses: currentExpenses,
    },
    previousPeriod: {
      startDate: previousStartDate,
      endDate: previousEndDate,
      revenue: previousRevenue,
      newCustomers: previousNewCustomers,
      underCollection: previousUnderCollection,
      expenses: previousExpenses,
    },
  };
};

module.exports = {
  getSummeryData,
};
