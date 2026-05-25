import { Request, Response } from "express";
import Task from "../models/taskModel";
import { logTimeline } from "../services/timelineService";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo, linkedTo, overdue, mine, page = "1" } =
      req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (linkedTo) filter.linkedTo = linkedTo;
    if (mine === "true") filter.assignedTo = req.user!.id;
    if (overdue === "true") {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $nin: ["done", "cancelled"] };
    }

    const limit = 50;
    const skip = (parseInt(page, 10) - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "name email")
        .populate("createdBy", "name")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({ data: tasks, total, page: parseInt(page, 10), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTaskSummary = async (_req: Request, res: Response) => {
  try {
    const counts = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const summary: Record<string, number> = {
      todo: 0, in_progress: 0, review: 0, done: 0, cancelled: 0,
    };
    counts.forEach(({ _id, count }: { _id: string; count: number }) => {
      summary[_id] = count;
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const task = new Task({ ...req.body, createdBy: req.user!.id });
    await task.save();
    await task.populate("assignedTo", "name email");

    if (task.linkedTo && task.linkedModel) {
      await logTimeline(
        "task.created",
        `Task "${task.title}" created`,
        task.linkedTo.toString(),
        task.linkedModel as "Customer" | "Deal",
        { title: task.title, priority: task.priority },
        req.user!.id
      );
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name");
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    const wasDone = task.status === "done";
    task.status = wasDone ? "todo" : "done";
    task.completedAt = wasDone ? undefined : new Date();
    await task.save();

    if (!wasDone && task.linkedTo && task.linkedModel) {
      await logTimeline(
        "task.completed",
        `Task "${task.title}" completed`,
        task.linkedTo.toString(),
        task.linkedModel as "Customer" | "Deal",
        { title: task.title },
        req.user!.id
      );
    }

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
