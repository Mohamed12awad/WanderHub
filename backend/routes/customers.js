const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const { isAuthorized } = require("../middleware/auth");

router.post("/", customerController.createCustomer);
router.get("/", customerController.getCustomers);
router.get("/:id", customerController.getCustomerById);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", isAuthorized("admin"), customerController.deleteCustomer);

// And so on for other CRUD operations...

module.exports = router;
