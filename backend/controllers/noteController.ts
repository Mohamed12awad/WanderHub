import { Request, Response } from "express";
import Note from "../models/noteModel";
import { logTimeline } from "../services/timelineService";

const TIMELINE_MODELS = new Set(["Customer", "Deal"]);

const canModify = (req: Request, createdById: string) =>
  req.user!.id === createdById ||
  req.user!.permissions.includes("*") ||
  req.user!.role === "admin";

export const getNotes = async (req: Request, res: Response) => {
  try {
    const { linkedTo, linkedModel } = req.query as {
      linkedTo?: string;
      linkedModel?: string;
    };
    if (!linkedTo || !linkedModel) {
      return res.status(400).json({ message: "linkedTo and linkedModel are required" });
    }

    const notes = await Note.find({ linkedTo, linkedModel })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const note = new Note({ ...req.body, createdBy: req.user!.id });
    await note.save();
    await note.populate("createdBy", "name");

    if (TIMELINE_MODELS.has(note.linkedModel)) {
      const preview = note.content.slice(0, 80) + (note.content.length > 80 ? "…" : "");
      await logTimeline(
        "note.added",
        `Note added: "${preview}"`,
        note.linkedTo.toString(),
        note.linkedModel as "Customer" | "Deal",
        { preview },
        req.user!.id
      );
    }

    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (!canModify(req, note.createdBy.toString())) {
      return res.status(403).json({ message: "You can only edit your own notes" });
    }

    note.content = req.body.content;
    await note.save();
    await note.populate("createdBy", "name");
    res.json(note);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (!canModify(req, note.createdBy.toString())) {
      return res.status(403).json({ message: "You can only delete your own notes" });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
