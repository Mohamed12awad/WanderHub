import { Request, Response } from "express";
import mongoose from "mongoose";
import Deal from "../models/dealModel";
import PartialPayment from "../models/partialPaymentModel";
import Purchase from "../models/purchaseModel";
import Expense from "../models/expensesModel";

const getDealsReport = async (start: Date, end: Date) => {
  return Deal.find({ createdAt: { $gte: start, $lte: end } })
    .populate("customer")
    .populate("product");
};

const getPaymentsReport = async (start: Date, end: Date) => {
  return PartialPayment.find({ date: { $gte: start, $lte: end } }).populate("booking");
};

const getPurchasesReport = async (start: Date, end: Date) => {
  return Purchase.find({ createdAt: { $gte: start, $lte: end } });
};

const getExpensesReport = async (start: Date, end: Date) => {
  return Expense.find({ "expenses.date": { $gte: start, $lte: end } });
};

export const getAccountingReport = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and end date are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const [deals, payments, purchases, expenses] = await Promise.all([
      getDealsReport(start, end),
      getPaymentsReport(start, end),
      getPurchasesReport(start, end),
      getExpensesReport(start, end),
    ]);

    res.status(200).json({ bookings: deals, payments, purchases, expenses });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getBookingReport = async (req: Request, res: Response) => {
  const { startDate, endDate, location } = req.query as {
    startDate?: string;
    endDate?: string;
    location?: string;
  };

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and end date are required" });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
    ];

    if (location) {
      pipeline.push({ $match: { "customer.location": location } });
    }

    const deals = await Deal.aggregate(pipeline);
    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
