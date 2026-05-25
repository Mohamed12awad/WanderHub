import { Router } from "express";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { taskSchema, taskUpdateSchema } from "../middleware/schemas";
import {
  getTasks,
  getTaskSummary,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from "../controllers/taskController";

const router = Router();

router.get("/", requirePermission("tasks:view"), getTasks);
router.get("/summary", requirePermission("tasks:view"), getTaskSummary);
router.get("/:id", requirePermission("tasks:view"), getTaskById);
router.post("/", requirePermission("tasks:create"), validate(taskSchema), createTask);
router.put("/:id", requirePermission("tasks:edit"), validate(taskUpdateSchema), updateTask);
router.delete("/:id", requirePermission("tasks:delete"), deleteTask);
router.patch("/:id/complete", requirePermission("tasks:edit"), completeTask);

export default router;
