import mongoose, { Document, Schema } from "mongoose";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IInvoice extends Document {
  invoiceNumber: string;
  title: string;
  customer: mongoose.Types.ObjectId;
  deal?: mongoose.Types.ObjectId;
  quote?: mongoose.Types.ObjectId;
  status: InvoiceStatus;
  items: ILineItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  totalPaid: number;
  currency: string;
  issueDate: Date;
  dueDate?: Date;
  notes?: string;
  terms?: string;
  createdBy: mongoose.Types.ObjectId;
  approvalStatus: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
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

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    deal: { type: Schema.Types.ObjectId, ref: "Deal" },
    quote: { type: Schema.Types.ObjectId, ref: "Quote" },
    status: {
      type: String,
      enum: ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    items: [lineItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    notes: { type: String },
    terms: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

invoiceSchema.index({ customer: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IInvoice>("Invoice", invoiceSchema);
