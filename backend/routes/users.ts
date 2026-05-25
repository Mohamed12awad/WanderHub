import { Router } from "express";
import { createUser, getUsers, getUserById, updateUser, updateUserRole, updateUserActiveState, deleteUser } from "../controllers/userController";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { userCreateSchema, userUpdateSchema } from "../middleware/schemas";

const router = Router();

router.get("/", requirePermission("users:view"), getUsers);
router.get("/:id", requirePermission("users:view"), getUserById);
router.post("/", requirePermission("users:create"), validate(userCreateSchema), createUser);
router.put("/:id", requirePermission("users:edit"), validate(userUpdateSchema), updateUser);
router.put("/role/:id", requirePermission("users:edit"), updateUserRole);
router.put("/active/:id", requirePermission("users:edit"), updateUserActiveState);
router.delete("/:id", requirePermission("users:delete"), deleteUser);

export default router;
