const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { requireSignin, isAuthorized } = require("../middleware/auth");

// GET all expenses
router.get(
  "/",
  isAuthorized(["admin", "manager"]),
  expenseController.getExpenseReports
);

// GET expense by ID
router.get(
  "/:id",
  isAuthorized(["admin", "manager"]),
  expenseController.getExpenseReportById
);

// POST create a new expense
router.post(
  "/",
  isAuthorized(["admin", "manager"]),
  expenseController.createExpenseReport
);

// PUT update expense details
router.put(
  "/:id",
  isAuthorized(["admin", "manager"]),
  expenseController.updateExpenseReport
);
// Update an individual expense item
router.put(
  "/:id/expense/:expenseId",
  isAuthorized(["admin", "manager"]),
  expenseController.updateExpenseItem
);

// Update the approval status of an expense report

router.patch(
  "/:id/approval",
  isAuthorized(["admin", "manager"]),
  expenseController.updateApprovalStatus
);

// DELETE delete an expense
router.delete(
  "/:id",
  isAuthorized(["admin"]),
  expenseController.deleteExpenseReport
);

// Delete an individual expense item
router.delete("/:id/expense/:expenseId", expenseController.deleteExpenseItem);

module.exports = router;
