const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { requireSignin, isAuthorized } = require("../middleware/auth");

router.post("/", requireSignin, bookingController.createBooking);
router.get("/", requireSignin, bookingController.getBookings);
router.get("/:id", requireSignin, bookingController.getBookingById);
router.put("/:id", requireSignin, bookingController.updateBooking);
router.get("/:id/invoice", requireSignin, bookingController.getInvoice);
router.delete(
  "/:id",
  requireSignin,
  isAuthorized(["admin"]),
  bookingController.deleteBooking
);

// And so on for other CRUD operations...

module.exports = router;
