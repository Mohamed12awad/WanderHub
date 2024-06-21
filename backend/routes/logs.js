const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const { requireSignin, isAuthorized } = require("../middleware/auth");
const logAction = require("../middleware/logging");

router.get(
  "/",
  requireSignin,
  isAuthorized("admin"),
  //   logAction("create_booking"),
  logController.getLogs
);

module.exports = router;
