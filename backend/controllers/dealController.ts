import { Request, Response } from "express";
import Deal from "../models/dealModel";
import Customer from "../models/customerModel";
import PartialPayment from "../models/partialPaymentModel";
import Quote from "../models/quoteModel";
import generateInvoice from "../utils/generateInvoice";
import { logTimeline } from "../services/timelineService";
import { nextNumber } from "../services/numberSequenceService";

export const createDeal = async (req: Request, res: Response) => {
  const { customer: customerId, totalPaid } = req.body as {
    customer: string;
    totalPaid?: number;
  };

  try {
    const deal = new Deal(req.body);
    await deal.save();

    const customer = await Customer.findById(customerId);
    if (customer) {
      customer.bookingHistory.push(deal._id as never);
      await customer.save();
    }

    if (totalPaid && totalPaid > 0) {
      const payment = new PartialPayment({
        booking: deal._id,
        amount: totalPaid,
        date: new Date(),
        createdBy: req.user!.id,
      });
      await payment.save();
    }

    await logTimeline(
      "deal.created",
      `Deal "${deal.title}" created`,
      deal._id as unknown as string,
      "Deal",
      { title: deal.title, status: deal.status },
      req.user!.id
    );

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + (error as Error).message });
  }
};

export const getDeals = async (req: Request, res: Response) => {
  try {
    const { page, limit: limitRaw, q, status, source, closeDate_from, closeDate_to } = req.query as Record<string, string>;
    if (!page) {
      const deals = await Deal.find()
        .populate("customer", "name")
        .populate("product", "name")
        .sort({ createdAt: -1 });
      return res.json(deals);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const filter: Record<string, unknown> = {};
    if (q) filter.title = new RegExp(q, "i");
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (closeDate_from || closeDate_to) {
      const range: Record<string, Date> = {};
      if (closeDate_from) range.$gte = new Date(closeDate_from);
      if (closeDate_to) range.$lte = new Date(closeDate_to);
      filter.expectedCloseDate = range;
    }
    const [data, total] = await Promise.all([
      Deal.find(filter)
        .populate("customer", "name")
        .populate("product", "name")
        .sort({ createdAt: -1 })
        .skip((p - 1) * limit)
        .limit(limit),
      Deal.countDocuments(filter),
    ]);
    res.json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getDealById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includePayments = req.query.includePayments === "true";

    const deal = await Deal.findById(id)
      .populate({
        path: "customer",
        select: "name phone mobile",
        populate: { path: "owner", select: "name phone" },
      })
      .populate("product", "name");

    if (!deal) return res.status(404).json({ message: "Deal not found" });

    let payments: unknown[] = [];
    if (includePayments) {
      payments = await PartialPayment.find({ booking: id }).populate("createdBy", "name");
    }

    res.json({ deal, payments });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getInvoice = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("customer")
      .populate("product");
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const payments = await PartialPayment.find({ booking: req.params.id });
    const pdfBuffer = await generateInvoice(deal, payments);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${deal._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateDeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const oldDeal = await Deal.findById(id);
    if (!oldDeal) return res.status(404).json({ message: "Deal not found" });

    const deal = await Deal.findByIdAndUpdate(id, req.body, { new: true });

    const newStatus = req.body.status as string | undefined;
    if (newStatus && newStatus !== oldDeal.status) {
      const eventType =
        newStatus === "won" ? "deal.won" :
        newStatus === "lost" ? "deal.lost" :
        "deal.stage_changed";

      await logTimeline(
        eventType,
        `Status changed: ${oldDeal.status} → ${newStatus}`,
        id as string,
        "Deal",
        { from: oldDeal.status, to: newStatus },
        req.user!.id
      );
    }

    res.json(deal);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const createQuoteFromDeal = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("customer", "name")
      .populate("product", "name price");
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const product = deal.product as { name?: string; price?: number } | null;
    const items = product ? [{
      description: product.name ?? "Service",
      quantity: deal.quantity || 1,
      unitPrice: deal.price,
      discount: 0,
      total: deal.price * (deal.quantity || 1),
    }] : [{
      description: deal.title,
      quantity: 1,
      unitPrice: deal.price,
      discount: 0,
      total: deal.price,
    }];

    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const quoteNumber = await nextNumber("quote", "QUO");

    const quote = await Quote.create({
      quoteNumber,
      title: `Quote for ${deal.title}`,
      customer: deal.customer,
      deal: deal._id,
      items,
      subtotal,
      taxRate: 0,
      tax: 0,
      total: subtotal,
      currency: deal.currency || "USD",
      createdBy: req.user!.id,
    });

    res.status(201).json(quote);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const deleteDeal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findById(id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const customer = await Customer.findById(deal.customer);
    if (customer) {
      customer.bookingHistory = customer.bookingHistory.filter(
        (bid) => bid.toString() !== deal._id!.toString()
      );
      await customer.save();
    }

    await PartialPayment.deleteMany({ booking: deal._id });
    await Deal.findByIdAndDelete(id);

    res.json({ message: "Deal deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
