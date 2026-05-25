import mongoose, { Document, Schema } from "mongoose";

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "cheque" | "other";

export interface IInvoicePayment extends Document {
  invoice: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  date: Date;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    date: { type: Date, required: true },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "cheque", "other"],
      default: "cash",
    },
    reference: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

invoicePaymentSchema.index({ invoice: 1, createdAt: -1 });

export default mongoose.model<IInvoicePayment>("InvoicePayment", invoicePaymentSchema);
