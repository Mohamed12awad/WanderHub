import Deal from "../models/dealModel";
import Customer from "../models/customerModel";
import ExpenseReport from "../models/expensesModel";

const getRevenue = async (startDate: Date, endDate: Date) => {
  const payments = await Deal.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    { $group: { _id: "$currency", totalAmount: { $sum: "$price" } } },
  ]);
  return payments.reduce<Record<string, number>>((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    return acc;
  }, {});
};

const getNewCustomers = async (startDate: Date, endDate: Date) => {
  return Customer.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
  });
};

const getUnderCollection = async (startDate: Date, endDate: Date) => {
  const underCollection = await Deal.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
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
  return underCollection.reduce<Record<string, number>>((acc, curr) => {
    acc[curr._id] = curr.totalDue;
    return acc;
  }, {});
};

const getExpenses = async (startDate: Date, endDate: Date) => {
  const totalExpenses = await ExpenseReport.aggregate([
    { $unwind: "$expenses" },
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        approved: true,
      },
    },
    { $group: { _id: null, totalAmount: { $sum: "$expenses.amount" } } },
  ]);

  const categorizedExpenses = await ExpenseReport.aggregate([
    { $unwind: "$expenses" },
    {
      $match: {
        "expenses.date": { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$expenses.category",
        totalAmount: { $sum: "$expenses.amount" },
      },
    },
  ]);

  const totalAmount = totalExpenses.length ? (totalExpenses[0].totalAmount as number) : 0;
  const expensesByCategory = categorizedExpenses.reduce<Record<string, number>>((acc, curr) => {
    acc[curr._id] = curr.totalAmount;
    return acc;
  }, {});

  return { total: totalAmount, categories: expensesByCategory };
};

export const getSummeryData = async (timePeriod?: string) => {
  const now = new Date();
  let currentStartDate: Date, currentEndDate: Date, previousStartDate: Date, previousEndDate: Date;

  switch (timePeriod) {
    case "week": {
      const today = new Date(now);
      currentStartDate = new Date(today);
      currentStartDate.setDate(today.getDate() - 7);
      currentEndDate = new Date(today);
      previousStartDate = new Date(today);
      previousStartDate.setDate(today.getDate() - 14);
      previousEndDate = new Date(currentStartDate);
      break;
    }
    case "quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      currentStartDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      currentEndDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
      previousStartDate = new Date(now.getFullYear(), (currentQuarter - 2) * 3, 1);
      previousEndDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 0);
      break;
    }
    default: {
      currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }
  }

  const [
    currentRevenue,
    previousRevenue,
    currentNewCustomers,
    previousNewCustomers,
    currentUnderCollection,
    previousUnderCollection,
    currentExpenses,
    previousExpenses,
  ] = await Promise.all([
    getRevenue(currentStartDate, currentEndDate),
    getRevenue(previousStartDate, previousEndDate),
    getNewCustomers(currentStartDate, currentEndDate),
    getNewCustomers(previousStartDate, previousEndDate),
    getUnderCollection(currentStartDate, currentEndDate),
    getUnderCollection(previousStartDate, previousEndDate),
    getExpenses(currentStartDate, currentEndDate),
    getExpenses(previousStartDate, previousEndDate),
  ]);

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
