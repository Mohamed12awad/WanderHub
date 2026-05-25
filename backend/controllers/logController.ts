import { Request, Response } from "express";
import Log from "../models/logModel";

export const getLogs = async (req: Request, res: Response) => {
  try {
    const { user, action, startDate, endDate, recordId, page, limit: limitRaw } = req.query as Record<string, string>;
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

    if (!page) {
      const logs = await Log.find(query).populate("userId", "name email").sort({ timestamp: -1 }).limit(500);
      return res.status(200).json(logs);
    }

    const p = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, parseInt(limitRaw) || 50);
    const [data, total] = await Promise.all([
      Log.find(query).populate("userId", "name email").sort({ timestamp: -1 }).skip((p - 1) * limit).limit(limit),
      Log.countDocuments(query),
    ]);
    res.status(200).json({ data, total, page: p, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
