const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportsController");
const { requireSignin, isAuthorized } = require("../middleware/auth");

router.get(
  "/",
  requireSignin,
  isAuthorized(["admin"]),
  reportController.getAccountingReport
);

router.get("/bookings", reportController.getBookingReport);

module.exports = router;
