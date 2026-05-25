import { Router } from "express";
import { getSummery } from "../controllers/summeryController";

const router = Router();

router.get("/", getSummery);

export default router;
