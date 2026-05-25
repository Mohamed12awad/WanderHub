import { Request, Response } from "express";
import Customer from "../models/customerModel";
import Deal from "../models/dealModel";
import Product from "../models/productModel";
import ExpenseReport from "../models/expensesModel";
import Invoice from "../models/invoiceModel";

const LIMIT = 5;

export const globalSearch = async (req: Request, res: Response) => {
  const q = ((req.query.q as string) ?? "").trim();
  if (!q || q.length < 2) {
    return res.json({ customers: [], deals: [], products: [], expenses: [], invoices: [] });
  }

  const rx = new RegExp(q, "i");

  try {
    const [customers, deals, products, expenses, invoices] = await Promise.all([
      Customer.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] })
        .select("_id name email phone status")
        .limit(LIMIT),
      Deal.find({ title: rx })
        .populate("customer", "name")
        .select("_id title status price currency customer")
        .limit(LIMIT),
      Product.find({ $or: [{ name: rx }, { type: rx }] })
        .select("_id name type")
        .limit(LIMIT),
      ExpenseReport.find({ title: rx })
        .select("_id title approved createdAt")
        .limit(LIMIT),
      Invoice.find({ $or: [{ invoiceNumber: rx }, { title: rx }] })
        .populate("customer", "name")
        .select("_id invoiceNumber title status total currency customer")
        .limit(LIMIT),
    ]);

    res.json({ customers, deals, products, expenses, invoices });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
