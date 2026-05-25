import { Router } from "express";
import {
  getExpenseReports, getExpenseReportById, createExpenseReport,
  updateExpenseReport, updateExpenseItem, updateApprovalStatus,
  approveExpenseReport, rejectExpenseReport,
  deleteExpenseReport, deleteExpenseItem,
} from "../controllers/expenseController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", requirePermission("expenses:view"), getExpenseReports);
router.get("/:id", requirePermission("expenses:view"), getExpenseReportById);
router.post("/", requirePermission("expenses:create"), createExpenseReport);
router.put("/:id", requirePermission("expenses:edit"), updateExpenseReport);
router.put("/:id/expense/:expenseId", requirePermission("expenses:edit"), updateExpenseItem);
router.patch("/:id/approval", requirePermission("expenses:approve"), updateApprovalStatus);
router.patch("/:id/approve", requirePermission("expenses:approve"), approveExpenseReport);
router.patch("/:id/reject", requirePermission("expenses:approve"), rejectExpenseReport);
router.delete("/:id", requirePermission("expenses:delete"), deleteExpenseReport);
router.delete("/:id/expense/:expenseId", requirePermission("expenses:edit"), deleteExpenseItem);

export default router;
