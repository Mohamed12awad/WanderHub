const User = require("../models/userModel");
const bcrypt = require("bcryptjs");

const handleError = (err) => {
  console.log(err.message, err.code);
  let errors = {};

  // duplicate email
  if (err.code === 11000) {
    err.keyPattern.email ? (errors.email = "Email already exists.") : "";
    err.keyPattern.username ? (errors.username = "Username  exists.") : "";

    return errors;
  }

  if (err.message.includes("User validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    let errMsg = handleError(error);
    res.status(400).json({ errMsg });
    // res.status(400).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const users = await User.findById(id).populate("role", "name");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, role, ...updateData } = req.body;

    // Check if the update includes the role change
    if (role) {
      const user = await User.findById(id).populate("role");

      // Prevent non-super admin from changing roles to or from super admin
      if (
        (user.role.name === "super admin" || role === "super admin") &&
        req.user.role !== "super admin"
      ) {
        return res
          .status(403)
          .json({ message: "Access denied. Super admin only." });
      }
    }

    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt();
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    let errMsg = handleError(error);
    res.status(400).json({ errMsg });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id, role } = req.body;
    const user = await User.findById(id).populate("role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent non-super admin from changing roles to or from super admin
    if (
      (user.role.name === "super admin" || role === "super admin") &&
      req.user.role !== "super admin"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    user.role = role;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUserActiveState = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.active = !user.active;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("role", "name");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is a super admin
    if (user.role.name === "super admin") {
      return res.status(403).json({ message: "Cannot delete super admin" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
