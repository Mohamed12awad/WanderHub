import mongoose, { Document, Schema, Types } from "mongoose";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";

export interface ITask extends Document {
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  assignedTo?: Types.ObjectId;
  linkedTo?: Types.ObjectId;
  linkedModel?: "Customer" | "Deal";
  completedAt?: Date;
  tags?: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["todo", "in_progress", "review", "done", "cancelled"], default: "todo" },
    dueDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    linkedTo: { type: Schema.Types.ObjectId, refPath: "linkedModel" },
    linkedModel: { type: String, enum: ["Customer", "Deal"] },
    completedAt: { type: Date },
    tags: [{ type: String, trim: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ linkedTo: 1, linkedModel: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

export default mongoose.model<ITask>("Task", taskSchema);
