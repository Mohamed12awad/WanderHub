import { Router } from "express";
import { requirePermission } from "../middleware/auth";
import { getApprovalSettings, updateApprovalSettings } from "../controllers/settingsController";

const router = Router();

router.get("/approvals", requirePermission("settings:view"), getApprovalSettings);
router.put("/approvals", requirePermission("settings:manage"), updateApprovalSettings);

export default router;
