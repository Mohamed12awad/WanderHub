import mongoose, { Document, Schema } from "mongoose";

interface IApprovalConfig {
  module: string;
  approverRoles: string[];
  enabled: boolean;
}

export interface IWorkspaceConfig extends Document {
  approvals: IApprovalConfig[];
}

const approvalConfigSchema = new Schema<IApprovalConfig>(
  {
    module: { type: String, required: true },
    approverRoles: [{ type: String }],
    enabled: { type: Boolean, default: false },
  },
  { _id: false }
);

const workspaceConfigSchema = new Schema<IWorkspaceConfig>(
  {
    approvals: { type: [approvalConfigSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IWorkspaceConfig>("WorkspaceConfig", workspaceConfigSchema);
