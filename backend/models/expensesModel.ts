import mongoose, { Schema, Document } from "mongoose";

export interface IExpenseItem {
  _id?: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  date: Date;
  category: string;
  beneficiary: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IExpenseReport extends Document {
  title: string;
  userId: mongoose.Types.ObjectId;
  approved: boolean;
  expenses: mongoose.Types.DocumentArray<IExpenseItem & Document>;
  approvalStatus: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
}

const expenseSchema = new Schema<IExpenseItem>({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  category: { type: String, required: true },
  beneficiary: { type: String, required: true },
});

const expenseReportSchema = new Schema<IExpenseReport>(
  {
    title: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    approved: { type: Boolean, default: false },
    expenses: [expenseSchema],
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IExpenseReport>("ExpenseReport", expenseReportSchema);
