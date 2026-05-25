import { Router } from "express";
import { getAccountingReport, getBookingReport } from "../controllers/reportsController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", requirePermission("reports:view"), getAccountingReport);
router.get("/bookings", requirePermission("reports:view"), getBookingReport);

export default router;
