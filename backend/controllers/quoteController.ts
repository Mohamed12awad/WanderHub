import { Request, Response } from "express";
import mongoose from "mongoose";
import Quote from "../models/quoteModel";
import Invoice from "../models/invoiceModel";
import { nextNumber } from "../services/numberSequenceService";

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

export const getQuotes = async (req: Request, res: Response) => {
  try {
    const { status, customer, deal } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    if (deal) filter.deal = deal;
    const quotes = await Quote.find(filter)
      .populate("customer", "name")
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const getQuoteById = async (req: Request, res: Response) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("customer", "name phone")
      .populate("deal", "title")
      .populate("convertedToInvoice", "invoiceNumber");
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const createQuote = async (req: Request, res: Response) => {
  try {
    const { items, taxRate = 0, ...rest } = req.body as {
      items: RawLineItem[];
      taxRate?: number;
      [key: string]: unknown;
    };
    const totals = calcTotals(items, taxRate);
    const quoteNumber = await nextNumber("quote", "QUO");
    const quote = await Quote.create({
      ...rest,
      ...totals,
      taxRate,
      quoteNumber,
      createdBy: req.user!.id,
    });
    res.status(201).json(quote);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quote = await Quote.findById(id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const { items, taxRate, ...rest } = req.body as {
      items?: RawLineItem[];
      taxRate?: number;
      [key: string]: unknown;
    };
    const update: Record<string, unknown> = { ...rest };
    if (items) {
      const totals = calcTotals(items, taxRate ?? quote.taxRate);
      Object.assign(update, totals, { taxRate: taxRate ?? quote.taxRate });
    } else if (taxRate !== undefined) {
      update.taxRate = taxRate;
    }

    const updated = await Quote.findByIdAndUpdate(id, update, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json({ message: "Quote deleted" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const convertQuoteToInvoice = async (req: Request, res: Response) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    if (quote.convertedToInvoice) {
      return res.status(400).json({ message: "Quote already converted to invoice" });
    }

    const invoiceNumber = await nextNumber("invoice", "INV");
    const invoice = await Invoice.create({
      invoiceNumber,
      title: quote.title,
      customer: quote.customer,
      deal: quote.deal,
      quote: quote._id,
      items: quote.items,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      tax: quote.tax,
      total: quote.total,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      issueDate: new Date(),
      createdBy: req.user!.id,
    });

    quote.convertedToInvoice = invoice._id as mongoose.Types.ObjectId;
    quote.status = "accepted";
    await quote.save();

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
