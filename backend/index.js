const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const customerRoutes = require("./routes/customers");
const bookingRoutes = require("./routes/bookings");
const partialPaymentRoutes = require("./routes/partialPayments");
const purchaseRoutes = require("./routes/purchases");
const roomRoutes = require("./routes/rooms");
const roomPriceRoutes = require("./routes/roomPrices");
const tripRoutes = require("./routes/trips");
const reportRoutes = require("./routes/reports");
const expenseRoutes = require("./routes/expenses");
const userRoutes = require("./routes/users");
const roleRoutes = require("./routes/roles");
const authRoutes = require("./routes/auth");
const logRoutes = require("./routes/logs");
const { requireSignin, isAuthorized } = require("./middleware/auth");
// const dbConfig = require("./config/database");

// app.use(cookieParser());
app.use(express.json());

// cors roles
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// uri
mongoose.connect(process.env.uri);

app.use("/api/auth", authRoutes);
app.use("/api/customers", requireSignin, customerRoutes);
app.use("/api/bookings", requireSignin, bookingRoutes);
app.use(
  "/api/partialPayments",
  requireSignin,
  isAuthorized("all"),
  partialPaymentRoutes
);
app.use("/api/purchases", requireSignin, isAuthorized("admin"), purchaseRoutes);
app.use("/api/rooms", requireSignin, roomRoutes);
app.use(
  "/api/roomPrices",
  requireSignin,
  isAuthorized("admin"),
  roomPriceRoutes
);
app.use("/api/trips", requireSignin, isAuthorized("all"), tripRoutes);
app.use("/api/reports", requireSignin, isAuthorized("admin"), reportRoutes);
app.use("/api/expenses", requireSignin, isAuthorized("admin"), expenseRoutes);
app.use("/api/users", requireSignin, userRoutes);
app.use("/api/roles", requireSignin, roleRoutes);
app.use("/api/logs", requireSignin, isAuthorized("admin"), logRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
