const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");

router.post("/", purchaseController.createPurchase);
router.get("/", purchaseController.getPurchases);

// And so on for other CRUD operations...

module.exports = router;
