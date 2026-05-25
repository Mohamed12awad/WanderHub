import { Request, Response } from "express";
import TimelineEvent from "../models/timelineEventModel";
import Activity from "../models/activityModel";

export const getTimeline = async (req: Request, res: Response) => {
  try {
    const { linkedTo, linkedModel } = req.query as {
      linkedTo?: string;
      linkedModel?: string;
    };

    if (!linkedTo || !linkedModel) {
      return res.status(400).json({ message: "linkedTo and linkedModel are required" });
    }

    const [events, activities] = await Promise.all([
      TimelineEvent.find({ linkedTo, linkedModel })
        .populate("triggeredBy", "name")
        .sort({ createdAt: -1 })
        .limit(100),
      Activity.find({ linkedTo, linkedModel })
        .populate("assignedTo", "name")
        .populate("createdBy", "name")
        .sort({ date: -1 })
        .limit(100),
    ]);

    const merged = [
      ...events.map((e) => ({ ...e.toObject(), _sourceType: "timeline" as const })),
      ...activities.map((a) => ({
        ...a.toObject(),
        _sourceType: "activity" as const,
        createdAt: a.date,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 60);

    res.json(merged);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
