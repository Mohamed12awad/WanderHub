import { Router } from "express";
import { validate } from "../middleware/validate";
import { noteSchema, noteUpdateSchema } from "../middleware/schemas";
import { getNotes, createNote, updateNote, deleteNote } from "../controllers/noteController";

const router = Router();

router.get("/", getNotes);
router.post("/", validate(noteSchema), createNote);
router.put("/:id", validate(noteUpdateSchema), updateNote);
router.delete("/:id", deleteNote);

export default router;
