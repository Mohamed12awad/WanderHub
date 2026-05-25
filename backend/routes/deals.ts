import { Router } from "express";
import { createDeal, getDeals, getDealById, updateDeal, deleteDeal, getInvoice } from "../controllers/dealController";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { dealSchema, dealUpdateSchema } from "../middleware/schemas";

const router = Router();

router.get("/", requirePermission("deals:view"), getDeals);
router.get("/:id", requirePermission("deals:view"), getDealById);
router.get("/:id/invoice", requirePermission("deals:view"), getInvoice);
router.post("/", requirePermission("deals:create"), validate(dealSchema), createDeal);
router.put("/:id", requirePermission("deals:edit"), validate(dealUpdateSchema), updateDeal);
router.delete("/:id", requirePermission("deals:delete"), deleteDeal);

export default router;
