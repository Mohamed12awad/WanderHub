import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  method: string;
  endpoint: string;
  recordId?: string;
  timestamp: Date;
}

const logSchema = new Schema<ILog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  method: { type: String, required: true },
  endpoint: { type: String, required: true },
  recordId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

logSchema.index({ timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<ILog>("Log", logSchema);
