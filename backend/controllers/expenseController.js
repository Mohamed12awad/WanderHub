const ExpenseReport = require("../models/expensesModel");

// Get all expense reports
exports.getExpenseReports = async (req, res) => {
  try {
    const expenseReports = await ExpenseReport.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(expenseReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get an expense report by ID
exports.getExpenseReportById = async (req, res) => {
  const { id } = req.params;
  try {
    const expenseReport = await ExpenseReport.findById(id).populate(
      "userId",
      "name"
    );
    if (!expenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }
    res.status(200).json(expenseReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new expense report
exports.createExpenseReport = async (req, res) => {
  const { title, expenses } = req.body;
  // createdBy: req.user.id,
  const newExpenseReport = new ExpenseReport({
    title,
    userId: req.user.id,
    expenses,
  });
  try {
    const savedExpenseReport = await newExpenseReport.save();
    res.status(201).json(savedExpenseReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an expense report by ID
exports.updateExpenseReport = async (req, res) => {
  try {
    const updatedExpenseReport = await ExpenseReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("userId", "expenses.userId");
    if (!updatedExpenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }
    res.json(updatedExpenseReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateExpenseItem = async (req, res) => {
  const { id, expenseId } = req.params;
  const updatedExpenseData = req.body;

  try {
    const expenseReport = await ExpenseReport.findById(id);
    if (!expenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }

    const expense = expenseReport.expenses.id(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    Object.assign(expense, updatedExpenseData);

    await expenseReport.save();
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateApprovalStatus = async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;

  try {
    const expenseReport = await ExpenseReport.findByIdAndUpdate(
      id,
      { approved },
      { new: true }
    );
    if (!expenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }
    res.json(expenseReport);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an expense report by ID
exports.deleteExpenseReport = async (req, res) => {
  try {
    const deletedExpenseReport = await ExpenseReport.findByIdAndDelete(
      req.params.id
    );
    if (!deletedExpenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExpenseItem = async (req, res) => {
  const { id, expenseId } = req.params;

  try {
    const expenseReport = await ExpenseReport.findById(id);
    if (!expenseReport) {
      return res.status(404).json({ message: "Expense report not found" });
    }

    const expense = expenseReport.expenses.id(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    expenseReport.expenses.pull(expenseId);
    await expenseReport.save();
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
