import { Router } from "express";
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../controllers/activityController";
import { validate } from "../middleware/validate";
import { activitySchema, activityUpdateSchema } from "../middleware/schemas";

const router = Router();

router.get("/", getActivities);
router.post("/", validate(activitySchema), createActivity);
router.put("/:id", validate(activityUpdateSchema), updateActivity);
router.delete("/:id", deleteActivity);

export default router;
