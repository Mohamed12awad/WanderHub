const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isAuthorized } = require("../middleware/auth");

router.get("/", userController.getUsers);
router.post("/", isAuthorized("admin"), userController.createUser);
router.put("/role/:id", isAuthorized("admin"), userController.updateUserRole);
router.put(
  "/active/:id",
  isAuthorized("admin"),
  userController.updateUserActiveState
);
router.delete("/:id", isAuthorized("admin"), userController.deleteUser);

module.exports = router;
