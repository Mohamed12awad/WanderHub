import { Router } from "express";
import {
  createPartialPayment, getPartialPaymentsByBooking,
  getPartialPayment, updatePartialPayment, deletePartialPayment,
} from "../controllers/partialPaymentController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.post("/", requirePermission("deals:edit"), createPartialPayment);
router.get("/booking/:bookingId", requirePermission("deals:view"), getPartialPaymentsByBooking);
router.get("/:id", requirePermission("deals:view"), getPartialPayment);
router.put("/:id", requirePermission("deals:edit"), updatePartialPayment);
router.delete("/:id", requirePermission("deals:edit"), deletePartialPayment);

export default router;
