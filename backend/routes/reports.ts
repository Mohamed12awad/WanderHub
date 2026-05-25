import { Router } from "express";
import {
  getAccountingReport, getBookingReport,
  getRevenueByMonth, getPipelineFunnel, getExpensesByCategory,
  getOutstandingInvoices, getCustomerAcquisition,
} from "../controllers/reportsController";
import { requirePermission } from "../middleware/auth";

const router = Router();

// Analytics
router.get("/revenue", requirePermission("reports:view"), getRevenueByMonth);
router.get("/pipeline", requirePermission("reports:view"), getPipelineFunnel);
router.get("/expenses-category", requirePermission("reports:view"), getExpensesByCategory);
router.get("/outstanding", requirePermission("reports:view"), getOutstandingInvoices);
router.get("/customer-acquisition", requirePermission("reports:view"), getCustomerAcquisition);

// Legacy
router.get("/", requirePermission("reports:view"), getAccountingReport);
router.get("/bookings", requirePermission("reports:view"), getBookingReport);

export default router;
