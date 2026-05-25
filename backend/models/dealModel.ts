import mongoose, { Schema, Document } from "mongoose";

export type DealStatus =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"
  | "cancelled";

export interface IDeal extends Document {
  customer: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  title: string;
  price: number;
  currency: string;
  totalPaid: number;
  status: DealStatus;
  source?: string;
  quantity: number;
  expectedCloseDate?: Date;
  notes?: string;
}

const dealSchema = new Schema<IDeal>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    title: { type: String, required: [true, "Please provide a deal title"] },
    price: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    totalPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost", "cancelled"],
      default: "lead",
    },
    source: { type: String },
    quantity: { type: Number, default: 1 },
    expectedCloseDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

dealSchema.index({ customer: 1, status: 1 });
dealSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IDeal>("Deal", dealSchema);
