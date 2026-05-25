import { Request, Response } from "express";
import WorkspaceConfig from "../models/workspaceConfigModel";

export const getApprovalSettings = async (_req: Request, res: Response) => {
  try {
    const config = await WorkspaceConfig.findOne();
    res.json(config?.approvals ?? []);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

export const updateApprovalSettings = async (req: Request, res: Response) => {
  try {
    const { approvals } = req.body as { approvals: { module: string; approverRoles: string[]; enabled: boolean }[] };
    const config = await WorkspaceConfig.findOneAndUpdate(
      {},
      { approvals },
      { new: true, upsert: true }
    );
    res.json(config.approvals);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
