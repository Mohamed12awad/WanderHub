const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { requireSignin, isAuthorized } = require("../middleware/auth");

// router.post(
//   "/",
//   requireSignin,
//   isAuthorized(["admin"]),
//   expenseController.createExpense
// );
// router.get(
//   "/",
//   requireSignin,
//   isAuthorized(["admin", "manager"]),
//   expenseController.getExpenses
// );

// GET all expenses
router.get(
  "/",
  isAuthorized(["admin", "manager"]),
  expenseController.getExpenses
);

// GET expense by ID
router.get(
  "/:id",
  isAuthorized(["admin", "manager"]),
  expenseController.getExpenseById
);

// POST create a new expense
router.post(
  "/",
  isAuthorized(["admin", "manager"]),
  expenseController.createExpense
);

// PUT update expense details
router.put(
  "/:id",
  isAuthorized(["admin", "manager"]),
  expenseController.updateExpense
);

// DELETE delete an expense
router.delete(
  "/:id",
  isAuthorized(["admin", "manager"]),
  expenseController.deleteExpense
);

module.exports = router;
