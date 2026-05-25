import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  type?: string;
  capacity?: number;
  location?: string;
  notes?: string;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    type: { type: String },
    capacity: { type: Number },
    location: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);
