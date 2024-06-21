const express = require("express");
const router = express.Router();
const roomPriceController = require("../controllers/roomPriceController");

// GET all room prices
router.get("/", roomPriceController.getRoomPrices);

// GET room price by ID
router.get("/:id", roomPriceController.getRoomPriceById);

// POST create a new room price
router.post("/", roomPriceController.createRoomPrice);

// PUT update room price details
router.put("/:id", roomPriceController.updateRoomPrice);

// DELETE delete a room price
router.delete("/:id", roomPriceController.deleteRoomPrice);
// And so on for other CRUD operations...

module.exports = router;
