const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { requireSignin, isAuthorized } = require("../middleware/auth");

router.post(
  "/",
  requireSignin,
  isAuthorized(["admin", "manager"]),
  bookingController.createBooking
);
router.get(
  "/",
  requireSignin,
  isAuthorized(["admin", "manager"]),
  bookingController.getBookings
);
router.get(
  "/:id",
  requireSignin,
  isAuthorized(["admin", "manager"]),
  bookingController.getBookingById
);
router.put(
  "/:id",
  requireSignin,
  isAuthorized(["admin", "manager"]),
  bookingController.updateBooking
);
router.get(
  "/:id/invoice",
  requireSignin,
  isAuthorized(["admin", "manager"]),
  bookingController.getInvoice
);
router.delete(
  "/invoice/:id",
  requireSignin,
  isAuthorized(["admin"]),
  bookingController.updateBooking
);

// And so on for other CRUD operations...

module.exports = router;
