import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  name: string;
  permissions: string[];
}

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export default mongoose.model<IRole>("Role", roleSchema);
