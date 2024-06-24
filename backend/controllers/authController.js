const User = require("../models/userModel");
const { generateToken } = require("../middleware/auth");

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

exports.signup = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email })
      .populate("role")
      .select("+password");
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.active === false) {
      return res.status(400).json({ message: "User is Blocked" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = generateToken(user);
    // res.user = { userId: user._id, role: user.role.name };
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
