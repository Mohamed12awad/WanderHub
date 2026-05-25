import { Router } from "express";
import { getRoles, createRole, updateRole, deleteRole } from "../controllers/roleController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", requirePermission("roles:view"), getRoles);
router.post("/", requirePermission("roles:manage"), createRole);
router.put("/:id", requirePermission("roles:manage"), updateRole);
router.delete("/:id", requirePermission("roles:manage"), deleteRole);

export default router;
