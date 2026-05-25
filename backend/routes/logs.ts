import { Router } from "express";
import { getLogs } from "../controllers/logController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", requirePermission("logs:view"), getLogs);

export default router;
