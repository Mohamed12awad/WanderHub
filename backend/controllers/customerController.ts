import { Request, Response } from "express";
import Customer from "../models/customerModel";
import Deal from "../models/dealModel";
import PartialPayment from "../models/partialPaymentModel";
import { logTimeline } from "../services/timelineService";

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();

    await logTimeline(
      "contact.created",
      `Contact "${customer.name}" created`,
      customer._id as unknown as string,
      "Customer",
      { name: customer.name },
      req.user!.id
    );

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { page, limit: limitRaw, q, status } = req.query as Record<string, string>;
    if (!page) {
      const customers = await Customer.find().sort({ createdAt: -1 });
      return res.json(customers);
    }
    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 25);
    const filter: Record<string, unknown> = {};
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { email: new RegExp(q, "i") }, { phone: new RegExp(q, "i") }];
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip((p - 1) * limit).limit(limit),
      Customer.countDocuments(filter),
    ]);
    res.json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("bookingHistory")
      .populate("owner");

    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (customer.bookingHistory.length > 0) {
      await Promise.all(
        customer.bookingHistory.map(async (dealId) => {
          const deal = await Deal.findById(dealId);
          if (deal) {
            await PartialPayment.deleteMany({ booking: deal._id });
            await Deal.findByIdAndDelete(dealId);
          }
        })
      );
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.status(204).json({ message: "Customer, related deals, and payments deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
