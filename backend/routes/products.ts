import { Router } from "express";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/productController";
import { requirePermission } from "../middleware/auth";

const router = Router();

router.get("/", requirePermission("products:view"), getProducts);
router.get("/:id", requirePermission("products:view"), getProductById);
router.post("/", requirePermission("products:create"), createProduct);
router.put("/:id", requirePermission("products:edit"), updateProduct);
router.delete("/:id", requirePermission("products:delete"), deleteProduct);

export default router;
