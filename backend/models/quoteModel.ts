import mongoose, { Document, Schema } from "mongoose";

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface IQuote extends Document {
  quoteNumber: string;
  title: string;
  customer: mongoose.Types.ObjectId;
  deal?: mongoose.Types.ObjectId;
  status: QuoteStatus;
  items: ILineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  currency: string;
  validUntil?: Date;
  notes?: string;
  terms?: string;
  convertedToInvoice?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const lineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const quoteSchema = new Schema<IQuote>(
  {
    quoteNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    deal: { type: Schema.Types.ObjectId, ref: "Deal" },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    validUntil: { type: Date },
    notes: { type: String },
    terms: { type: String },
    convertedToInvoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

quoteSchema.index({ customer: 1, status: 1 });
quoteSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IQuote>("Quote", quoteSchema);
