import { Request, Response } from "express";
import Invoice from "../models/invoiceModel";
import InvoicePayment from "../models/invoicePaymentModel";
import Deal from "../models/dealModel";
import { nextNumber } from "../services/numberSequenceService";
import { InvoiceStatus } from "../models/invoiceModel";

interface RawLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

function calcTotals(items: RawLineItem[], taxRate = 0) {
  const computed = items.map((i) => {
    const disc = (i.discount ?? 0) / 100;
    return { ...i, discount: i.discount ?? 0, total: i.quantity * i.unitPrice * (1 - disc) };
  });
  const subtotal = computed.reduce((s, i) => s + i.total, 0);
  const tax = subtotal * (taxRate / 100);
  return { items: computed, subtotal, tax, total: subtotal + tax };
}

function deriveStatus(total: number, totalPaid: number, dueDate?: Date): InvoiceStatus {
  if (totalPaid <= 0) return "sent";
  if (totalPaid >= total) return "paid";
  if (dueDate && dueDate < new Date() && totalPaid < total) return "overdue";
  return "partially_paid";
}

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { status, customer, deal, page, limit: limitRaw, q } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    if (deal) filter.deal = deal;
    if (q) filter.$or = [{ invoiceNumber: new RegExp(q, "i") }, { title: new RegExp(q, "i") }];

    if (!page) {
      const invoices = await Invoice.find(filter)
        .populate("customer", "name")
        .sort({ createdAt: -1 });
      return res.json(invoices);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      Invoice.find(filter)
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .skip((p - 1) * limit)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);
    return res.json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer", "name phone")
      .populate("deal", "title")
      .populate("quote", "quoteNumber");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const payments = await InvoicePayment.find({ invoice: req.params.id })
      .populate("createdBy", "name")
      .sort({ date: -1 });

    res.json({ invoice, payments });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { items, taxRate = 0, ...rest } = req.body as {
      items: RawLineItem[];
      taxRate?: number;
      [key: string]: unknown;
    };
    const totals = calcTotals(items, taxRate);
    const invoiceNumber = await nextNumber("invoice", "INV");
    const invoice = await Invoice.create({
      ...rest,
      ...totals,
      taxRate,
      invoiceNumber,
      issueDate: (rest.issueDate as string) || new Date(),
      createdBy: req.user!.id,
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const { items, taxRate, ...rest } = req.body as {
      items?: RawLineItem[];
      taxRate?: number;
      [key: string]: unknown;
    };
    const update: Record<string, unknown> = { ...rest };
    if (items) {
      const totals = calcTotals(items, taxRate ?? invoice.taxRate);
      Object.assign(update, totals, { taxRate: taxRate ?? invoice.taxRate });
    }

    const updated = await Invoice.findByIdAndUpdate(id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    await InvoicePayment.deleteMany({ invoice: req.params.id });
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const payment = await InvoicePayment.create({
      ...req.body,
      invoice: id,
      createdBy: req.user!.id,
    });

    invoice.totalPaid = (invoice.totalPaid || 0) + Number(req.body.amount);
    invoice.status = deriveStatus(invoice.total, invoice.totalPaid, invoice.dueDate);
    await invoice.save();

    if (invoice.deal && invoice.totalPaid >= invoice.total) {
      await Deal.findByIdAndUpdate(invoice.deal, { status: "won" });
    }

    res.status(201).json({ payment, invoice });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const approveInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "approved", approvedBy: req.user!.id, approvedAt: new Date(), rejectionReason: undefined },
      { new: true }
    ).populate("customer", "name phone").populate("deal", "title").populate("quote", "quoteNumber").populate("createdBy", "name");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const rejectInvoice = async (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  if (!reason?.trim()) return res.status(400).json({ message: "Rejection reason is required" });
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "rejected", approvedBy: req.user!.id, approvedAt: new Date(), rejectionReason: reason.trim() },
      { new: true }
    ).populate("customer", "name phone").populate("deal", "title").populate("quote", "quoteNumber").populate("createdBy", "name");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { page, limit: limitRaw } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const [data, total] = await Promise.all([
      InvoicePayment.find()
        .populate({
          path: "invoice",
          select: "invoiceNumber title customer",
          populate: { path: "customer", select: "name" },
        })
        .populate("createdBy", "name")
        .sort({ date: -1 })
        .skip((p - 1) * limit)
        .limit(limit),
      InvoicePayment.countDocuments(),
    ]);
    res.json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { invoiceId, paymentId } = req.params;
    const payment = await InvoicePayment.findOneAndDelete({ _id: paymentId, invoice: invoiceId });
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.totalPaid = Math.max(0, (invoice.totalPaid || 0) - payment.amount);
      invoice.status = deriveStatus(invoice.total, invoice.totalPaid, invoice.dueDate);
      await invoice.save();
    }

    res.json({ message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
