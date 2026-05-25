import { Request, Response } from "express";
import Purchase from "../models/purchaseModel";

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const purchase = new Purchase(req.body);
    purchase.landedCost =
      purchase.price +
      purchase.shippingCost +
      purchase.tax +
      purchase.insurance +
      purchase.otherCosts;
    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const getPurchases = async (_req: Request, res: Response) => {
  try {
    const purchases = await Purchase.find();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
