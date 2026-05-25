import { Router } from "express";
import { signup, signin } from "../controllers/authController";
import { authLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { signinSchema, signupSchema } from "../middleware/schemas";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/signin", authLimiter, validate(signinSchema), signin);

export default router;
