import { Router } from "express";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  quoteCreateSchema,
  quoteUpdateSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoicePaymentSchema,
} from "../middleware/schemas";
import {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  convertQuoteToInvoice,
  approveQuote,
  rejectQuote,
} from "../controllers/quoteController";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  deleteInvoicePayment,
  approveInvoice,
  rejectInvoice,
  getPayments,
} from "../controllers/invoiceController";

const router = Router();

// ── Payments ─────────────────────────────────────────────────────────────────
router.get("/payments", requirePermission("finance:view"), getPayments);

// ── Quotes ────────────────────────────────────────────────────────────────────
router.get("/quotes", requirePermission("finance:view"), getQuotes);
router.get("/quotes/:id", requirePermission("finance:view"), getQuoteById);
router.post("/quotes", requirePermission("finance:create"), validate(quoteCreateSchema), createQuote);
router.put("/quotes/:id", requirePermission("finance:edit"), validate(quoteUpdateSchema), updateQuote);
router.delete("/quotes/:id", requirePermission("finance:delete"), deleteQuote);
router.post("/quotes/:id/convert", requirePermission("finance:create"), convertQuoteToInvoice);
router.patch("/quotes/:id/approve", requirePermission("finance:approve"), approveQuote);
router.patch("/quotes/:id/reject", requirePermission("finance:approve"), rejectQuote);

// ── Invoices ──────────────────────────────────────────────────────────────────
router.get("/invoices", requirePermission("finance:view"), getInvoices);
router.get("/invoices/:id", requirePermission("finance:view"), getInvoiceById);
router.post("/invoices", requirePermission("finance:create"), validate(invoiceCreateSchema), createInvoice);
router.put("/invoices/:id", requirePermission("finance:edit"), validate(invoiceUpdateSchema), updateInvoice);
router.delete("/invoices/:id", requirePermission("finance:delete"), deleteInvoice);
router.post("/invoices/:id/payments", requirePermission("finance:create"), validate(invoicePaymentSchema), recordPayment);
router.delete("/invoices/:invoiceId/payments/:paymentId", requirePermission("finance:delete"), deleteInvoicePayment);
router.patch("/invoices/:id/approve", requirePermission("finance:approve"), approveInvoice);
router.patch("/invoices/:id/reject", requirePermission("finance:approve"), rejectInvoice);

export default router;
