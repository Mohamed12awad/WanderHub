import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";

import customerRoutes from "./routes/customers";
import dealRoutes from "./routes/deals";
import partialPaymentRoutes from "./routes/partialPayments";
import purchaseRoutes from "./routes/purchases";
import productRoutes from "./routes/products";
import reportRoutes from "./routes/reports";
import expenseRoutes from "./routes/expenses";
import userRoutes from "./routes/users";
import roleRoutes from "./routes/roles";
import authRoutes from "./routes/auth";
import logRoutes from "./routes/logs";
import summeryRoutes from "./routes/summery";
import activityRoutes from "./routes/activities";
import taskRoutes from "./routes/tasks";
import timelineRoutes from "./routes/timeline";
import noteRoutes from "./routes/notes";
import financeRoutes from "./routes/finance";
import searchRoutes from "./routes/search";
import settingsRoutes from "./routes/settings";
import { requireSignin } from "./middleware/auth";
import { apiLimiter } from "./middleware/rateLimiter";

const app = express();

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ── Database ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.uri as string)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ── Rate limiting on mutation routes ─────────────────────────────────────────
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return apiLimiter(req, res, next);
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/customers", requireSignin, customerRoutes);
app.use("/api/deals", requireSignin, dealRoutes);
app.use("/api/partialPayments", requireSignin, partialPaymentRoutes);
app.use("/api/purchases", requireSignin, purchaseRoutes);
app.use("/api/products", requireSignin, productRoutes);
app.use("/api/reports", requireSignin, reportRoutes);
app.use("/api/expenses", requireSignin, expenseRoutes);
app.use("/api/users", requireSignin, userRoutes);
app.use("/api/roles", requireSignin, roleRoutes);
app.use("/api/logs", requireSignin, logRoutes);
app.use("/api/summery", requireSignin, summeryRoutes);
app.use("/api/activities", requireSignin, activityRoutes);
app.use("/api/tasks", requireSignin, taskRoutes);
app.use("/api/timeline", requireSignin, timelineRoutes);
app.use("/api/notes", requireSignin, noteRoutes);
app.use("/api/finance", requireSignin, financeRoutes);
app.use("/api/search", requireSignin, searchRoutes);
app.use("/api/settings", requireSignin, settingsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Unhandled error]", err.stack ?? err.message);
  res.status(500).json({ message: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
