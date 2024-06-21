const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");

// GET all rooms
router.get("/", roomController.getRooms);

// GET room by ID
router.get("/:id", roomController.getRoomById);

// POST create a new room
router.post("/", roomController.createRoom);

// PUT update room details
router.put("/:id", roomController.updateRoom);

// DELETE delete a room
router.delete("/:id", roomController.deleteRoom);

// And so on for other CRUD operations...

module.exports = router;
