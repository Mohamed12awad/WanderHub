import { Request, Response } from "express";
import mongoose from "mongoose";
import Deal from "../models/dealModel";
import PartialPayment from "../models/partialPaymentModel";
import Purchase from "../models/purchaseModel";
import Expense from "../models/expensesModel";
import Invoice from "../models/invoiceModel";
import InvoicePayment from "../models/invoicePaymentModel";
import Customer from "../models/customerModel";

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

// ── Analytics Reports ─────────────────────────────────────────────────────────

function parseDateRange(query: Record<string, string>): Record<string, Date> | null {
  if (!query.startDate && !query.endDate) return null;
  const range: Record<string, Date> = {};
  if (query.startDate) range.$gte = new Date(query.startDate);
  if (query.endDate) range.$lte = new Date(query.endDate);
  return range;
}

function toMonthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export const getRevenueByMonth = async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const dateFilter = parseDateRange(q);
  const match: Record<string, unknown> = dateFilter ? { date: dateFilter } : {};
  try {
    const data = await InvoicePayment.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.json(data.map((d) => ({ month: toMonthLabel(d._id.year, d._id.month), revenue: Math.round(d.revenue), count: d.count })));
  } catch (err) { res.status(500).json({ message: (err as Error).message }); }
};

export const getPipelineFunnel = async (_req: Request, res: Response) => {
  const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"];
  try {
    const data = await Deal.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 }, value: { $sum: "$price" } } },
    ]);
    const map = Object.fromEntries(data.map((d) => [d._id, d]));
    res.json(STAGES.map((s) => ({ stage: s, count: map[s]?.count ?? 0, value: Math.round(map[s]?.value ?? 0) })));
  } catch (err) { res.status(500).json({ message: (err as Error).message }); }
};

export const getExpensesByCategory = async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const dateFilter = parseDateRange(q);
  const pipeline: mongoose.PipelineStage[] = [
    { $unwind: "$expenses" },
    ...(dateFilter ? [{ $match: { "expenses.date": dateFilter } } as mongoose.PipelineStage] : []),
    { $group: { _id: "$expenses.category", total: { $sum: "$expenses.amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ];
  try {
    const data = await Expense.aggregate(pipeline);
    res.json(data.map((d) => ({ category: d._id || "uncategorized", total: Math.round(d.total), count: d.count })));
  } catch (err) { res.status(500).json({ message: (err as Error).message }); }
};

export const getOutstandingInvoices = async (_req: Request, res: Response) => {
  try {
    const invoices = await Invoice.find({ status: { $in: ["sent", "partially_paid", "overdue"] } })
      .populate("customer", "name")
      .populate("deal", "title")
      .sort({ dueDate: 1 })
      .limit(100);
    res.json(invoices.map((inv) => ({
      _id: inv._id, invoiceNumber: inv.invoiceNumber, title: inv.title,
      customer: inv.customer, deal: inv.deal, total: inv.total, totalPaid: inv.totalPaid,
      outstanding: inv.total - inv.totalPaid, dueDate: inv.dueDate,
      status: inv.status, currency: inv.currency,
    })));
  } catch (err) { res.status(500).json({ message: (err as Error).message }); }
};

export const getCustomerAcquisition = async (req: Request, res: Response) => {
  const q = req.query as Record<string, string>;
  const dateFilter = parseDateRange(q);
  const match: Record<string, unknown> = dateFilter ? { createdAt: dateFilter } : {};
  try {
    const data = await Customer.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.json(data.map((d) => ({ month: toMonthLabel(d._id.year, d._id.month), customers: d.count })));
  } catch (err) { res.status(500).json({ message: (err as Error).message }); }
};

// ── Legacy Reports ────────────────────────────────────────────────────────────

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
