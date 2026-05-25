import { Request, Response } from "express";
import ExpenseReport from "../models/expensesModel";

export const getExpenseReports = async (req: Request, res: Response) => {
  try {
    const { page, limit: limitRaw, q, category, approved, date_from, date_to } = req.query as Record<string, string>;
    if (!page) {
      const expenseReports = await ExpenseReport.find()
        .populate("userId", "name")
        .sort({ createdAt: -1 });
      return res.status(200).json(expenseReports);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const filter: Record<string, unknown> = {};
    if (q) filter.title = new RegExp(q, "i");
    if (approved !== undefined && approved !== "") filter.approved = approved === "true";
    if (category) filter["expenses.category"] = category;
    if (date_from || date_to) {
      const range: Record<string, Date> = {};
      if (date_from) range.$gte = new Date(date_from);
      if (date_to) range.$lte = new Date(date_to);
      filter["expenses.date"] = range;
    }
    const [data, total] = await Promise.all([
      ExpenseReport.find(filter)
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .skip((p - 1) * limit)
        .limit(limit),
      ExpenseReport.countDocuments(filter),
    ]);
    res.status(200).json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getExpenseReportById = async (req: Request, res: Response) => {
  try {
    const expenseReport = await ExpenseReport.findById(req.params.id).populate("userId", "name");
    if (!expenseReport) return res.status(404).json({ message: "Expense report not found" });
    res.status(200).json(expenseReport);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createExpenseReport = async (req: Request, res: Response) => {
  const { title, expenses } = req.body as { title: string; expenses: unknown[] };
  const newExpenseReport = new ExpenseReport({
    title,
    userId: req.user!.id,
    expenses,
  });
  try {
    const savedExpenseReport = await newExpenseReport.save();
    res.status(201).json(savedExpenseReport);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateExpenseReport = async (req: Request, res: Response) => {
  try {
    const updatedExpenseReport = await ExpenseReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("userId", "name");
    if (!updatedExpenseReport) return res.status(404).json({ message: "Expense report not found" });
    res.json(updatedExpenseReport);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateExpenseItem = async (req: Request, res: Response) => {
  const { id, expenseId } = req.params;
  try {
    const expenseReport = await ExpenseReport.findById(id);
    if (!expenseReport) return res.status(404).json({ message: "Expense report not found" });

    const expense = expenseReport.expenses.id(expenseId as string);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    Object.assign(expense, req.body);
    await expenseReport.save();
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateApprovalStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approved } = req.body as { approved: boolean };
  try {
    const expenseReport = await ExpenseReport.findByIdAndUpdate(
      id,
      { approved },
      { new: true }
    );
    if (!expenseReport) return res.status(404).json({ message: "Expense report not found" });
    res.json(expenseReport);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const approveExpenseReport = async (req: Request, res: Response) => {
  try {
    const report = await ExpenseReport.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "approved", approved: true, approvedBy: req.user!.id, approvedAt: new Date(), rejectionReason: undefined },
      { new: true }
    ).populate("userId", "name");
    if (!report) return res.status(404).json({ message: "Expense report not found" });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const rejectExpenseReport = async (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  if (!reason?.trim()) return res.status(400).json({ message: "Rejection reason is required" });
  try {
    const report = await ExpenseReport.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "rejected", approved: false, approvedBy: req.user!.id, approvedAt: new Date(), rejectionReason: reason.trim() },
      { new: true }
    ).populate("userId", "name");
    if (!report) return res.status(404).json({ message: "Expense report not found" });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteExpenseReport = async (req: Request, res: Response) => {
  try {
    const deletedExpenseReport = await ExpenseReport.findByIdAndDelete(req.params.id);
    if (!deletedExpenseReport) return res.status(404).json({ message: "Expense report not found" });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteExpenseItem = async (req: Request, res: Response) => {
  const { id, expenseId } = req.params;
  try {
    const expenseReport = await ExpenseReport.findById(id);
    if (!expenseReport) return res.status(404).json({ message: "Expense report not found" });

    const expense = expenseReport.expenses.id(expenseId as string);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    expense.deleteOne();
    await expenseReport.save();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
