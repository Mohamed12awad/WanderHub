import mongoose, { Schema, Document } from "mongoose";

export interface IPurchase extends Document {
  itemName: string;
  quantity: number;
  price: number;
  date: Date;
  supplier: string;
  shippingCost: number;
  tax: number;
  insurance: number;
  otherCosts: number;
  landedCost: number;
}

const purchaseSchema = new Schema<IPurchase>({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  date: { type: Date, required: true },
  supplier: { type: String, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  otherCosts: { type: Number, default: 0 },
  landedCost: { type: Number, default: 0 },
});

export default mongoose.model<IPurchase>("Purchase", purchaseSchema);
