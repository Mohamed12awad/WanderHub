import { Router } from "express";
import { createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer } from "../controllers/customerController";
import { requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { customerSchema, customerUpdateSchema } from "../middleware/schemas";

const router = Router();

router.get("/", requirePermission("contacts:view"), getCustomers);
router.get("/:id", requirePermission("contacts:view"), getCustomerById);
router.post("/", requirePermission("contacts:create"), validate(customerSchema), createCustomer);
router.put("/:id", requirePermission("contacts:edit"), validate(customerUpdateSchema), updateCustomer);
router.delete("/:id", requirePermission("contacts:delete"), deleteCustomer);

export default router;
