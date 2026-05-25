import { Request, Response } from "express";
import Activity from "../models/activityModel";
import { logTimeline } from "../services/timelineService";

export const getActivities = async (req: Request, res: Response) => {
  try {
    const { linkedTo, linkedModel, month, year } = req.query as {
      linkedTo?: string;
      linkedModel?: string;
      month?: string;
      year?: string;
    };

    const filter: Record<string, unknown> = {};
    if (linkedTo) filter.linkedTo = linkedTo;
    if (linkedModel) filter.linkedModel = linkedModel;

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lte: new Date(y, m, 0, 23, 59, 59),
      };
    }

    const activities = await Activity.find(filter)
      .populate("assignedTo", "name")
      .populate("createdBy", "name")
      .sort({ date: -1 });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createActivity = async (req: Request, res: Response) => {
  try {
    const activity = new Activity({
      ...req.body,
      createdBy: req.user!.id,
    });
    await activity.save();

    await logTimeline(
      "activity.logged",
      `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} logged: "${activity.title}"`,
      activity.linkedTo,
      activity.linkedModel as "Customer" | "Deal",
      { type: activity.type, title: activity.title },
      req.user!.id
    );

    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateActivity = async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    res.json(activity);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteActivity = async (req: Request, res: Response) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ message: "Activity not found" });
    res.json({ message: "Activity deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
