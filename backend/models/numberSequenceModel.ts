import mongoose, { Document, Schema } from "mongoose";

export interface INumberSequence extends Document {
  key: string;
  prefix: string;
  lastNumber: number;
  padLength: number;
  separator: string;
}

const numberSequenceSchema = new Schema<INumberSequence>({
  key: { type: String, required: true, unique: true },
  prefix: { type: String, default: "" },
  lastNumber: { type: Number, default: 0 },
  padLength: { type: Number, default: 4 },
  separator: { type: String, default: "-" },
});

export default mongoose.model<INumberSequence>("NumberSequence", numberSequenceSchema);
