import { Request, Response } from "express";
import Log from "../models/logModel";

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { user, action, startDate, endDate, recordId } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};

    if (user) query.userId = user;
    if (action) query.action = action;
    if (recordId) query.recordId = recordId;
    if (startDate || endDate) {
      const timestampQuery: Record<string, Date> = {};
      if (startDate) timestampQuery.$gte = new Date(startDate);
      if (endDate) timestampQuery.$lte = new Date(endDate);
      query.timestamp = timestampQuery;
    }

    const logs = await Log.find(query).populate("userId", "name email");
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
