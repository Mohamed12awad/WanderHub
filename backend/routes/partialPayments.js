const express = require("express");
const router = express.Router();
const partialPaymentController = require("../controllers/partialPaymentController");

router.post("/", partialPaymentController.createPartialPayment);
// router.get("/", partialPaymentController.getPartialPayments);

// And so on for other CRUD operations...

module.exports = router;
