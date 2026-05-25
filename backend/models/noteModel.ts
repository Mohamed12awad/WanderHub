import mongoose, { Document, Schema, Types } from "mongoose";

export type NoteLinkedModel = "Customer" | "Deal" | "Product" | "Expense";

export interface INote extends Document {
  content: string;
  linkedTo: Types.ObjectId;
  linkedModel: NoteLinkedModel;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    content: { type: String, required: true, maxlength: 10000 },
    linkedTo: { type: Schema.Types.ObjectId, required: true },
    linkedModel: {
      type: String,
      enum: ["Customer", "Deal", "Product", "Expense"],
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

noteSchema.index({ linkedTo: 1, linkedModel: 1, createdAt: -1 });

export default mongoose.model<INote>("Note", noteSchema);
