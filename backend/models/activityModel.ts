import mongoose, { Schema, Document } from "mongoose";

export type ActivityType = "call" | "meeting" | "task" | "note" | "email";
export type ActivityStatus = "pending" | "completed";

export interface IActivity extends Document {
  type: ActivityType;
  title: string;
  description?: string;
  date: Date;
  status: ActivityStatus;
  linkedTo: mongoose.Types.ObjectId;
  linkedModel: "Customer" | "Deal";
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ["call", "meeting", "task", "note", "email"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    linkedTo: { type: Schema.Types.ObjectId, required: true },
    linkedModel: { type: String, enum: ["Customer", "Deal"], required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

activitySchema.index({ linkedTo: 1, linkedModel: 1 });
activitySchema.index({ date: 1, status: 1 });
activitySchema.index({ assignedTo: 1 });

export default mongoose.model<IActivity>("Activity", activitySchema);
