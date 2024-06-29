// routes/summeryRoutes.js
const express = require("express");
const router = express.Router();
const summeryController = require("../controllers/summeryController");

router.get("/", summeryController.getSummeryData);

module.exports = router;
