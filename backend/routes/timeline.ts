import { Router } from "express";
import { getTimeline } from "../controllers/timelineController";

const router = Router();

router.get("/", getTimeline);

export default router;
