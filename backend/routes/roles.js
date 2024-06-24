const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const { isAuthorized } = require("../middleware/auth");

router.get("/", roleController.getRoles);
router.post("/", isAuthorized("admin"), roleController.createRole);

module.exports = router;
