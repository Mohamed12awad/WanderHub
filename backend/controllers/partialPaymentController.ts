import { Request, Response } from "express";
import PartialPayment from "../models/partialPaymentModel";
import Deal from "../models/dealModel";
import { logTimeline } from "../services/timelineService";

export const getPartialPaymentsByBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const partialPayments = await PartialPayment.find({ booking: bookingId });
    res.status(200).json({ partialPayments });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getPartialPayment = async (req: Request, res: Response) => {
  try {
    const partialPayment = await PartialPayment.findById(req.params.id);
    if (!partialPayment) return res.status(404).json({ message: "Partial payment not found" });
    res.status(200).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const createPartialPayment = async (req: Request, res: Response) => {
  try {
    const { booking, amount } = req.body as { booking: string; amount: number };

    const deal = await Deal.findById(booking);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const newTotalPaid = (deal.totalPaid || 0) + amount;
    if (newTotalPaid > deal.price) {
      return res.status(400).json({ message: "Payment exceeds total invoice amount" });
    }

    const partialPayment = new PartialPayment({
      ...req.body,
      createdBy: req.user!.id,
    });
    await partialPayment.save();

    await logTimeline(
      "payment.received",
      `Payment of ${partialPayment.amount} ${partialPayment.currency} received`,
      booking,
      "Deal",
      { amount: partialPayment.amount, currency: partialPayment.currency, method: partialPayment.method },
      req.user!.id
    );

    res.status(201).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updatePartialPayment = async (req: Request, res: Response) => {
  try {
    const partialPayment = await PartialPayment.findById(req.params.id);
    if (!partialPayment) return res.status(404).json({ message: "Partial payment not found" });

    Object.assign(partialPayment, req.body);
    await partialPayment.save();

    res.status(200).json({ partialPayment });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deletePartialPayment = async (req: Request, res: Response) => {
  try {
    const partialPayment = await PartialPayment.findOneAndDelete({ _id: req.params.id });
    if (!partialPayment) return res.status(404).json({ message: "Partial payment not found" });

    await logTimeline(
      "payment.deleted",
      `Payment of ${partialPayment.amount} ${partialPayment.currency} removed`,
      partialPayment.booking.toString(),
      "Deal",
      { amount: partialPayment.amount, currency: partialPayment.currency },
      req.user!.id
    );

    res.status(200).json({ message: "Partial payment deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
