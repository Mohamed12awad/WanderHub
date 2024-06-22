const express = require("express");
const router = express.Router();
const partialPaymentController = require("../controllers/partialPaymentController");

// Create a new partial payment
router.post("/", partialPaymentController.createPartialPayment);

// Get all partial payments for a specific booking
router.get(
  "/booking/:bookingId",
  partialPaymentController.getPartialPaymentsByBooking
);

// Get a single partial payment by its ID
router.get("/:id", partialPaymentController.getPartialPayment);

// Update a partial payment by its ID
router.put("/:id", partialPaymentController.updatePartialPayment);

// Delete a partial payment by its ID
router.delete("/:id", partialPaymentController.deletePartialPayment);

module.exports = router;
