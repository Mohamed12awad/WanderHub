const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/userModel");
// const expressJwt = require("express-jwt");

// const secret = "your_jwt_secret";

// Generate a JWT token
exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role.name },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h",
    }
  );
};

// Middleware to check if the user is authenticated
exports.requireSignin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    token = authHeader;
  }

  if (!token) {
    return res.status(401).json({ message: "Authorization required" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware to check if the user has the required role
exports.isAuthorized = (role) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).populate("role");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.active === false) {
        return res.status(403).json({ message: "User is blocked" });
      }

      if (user.role.name === "super admin") {
        return next();
      }

      if (!role.includes("all") && !role.includes(user.role.name)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  };
};
