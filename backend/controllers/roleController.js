const Role = require("../models/roleModel");

exports.createRole = async (req, res) => {
  const { name, permissions } = req.body;
  const newRole = new Role({ name, permissions });
  try {
    const savedRole = await newRole.save();
    res.status(201).json(savedRole);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();

    // Filter out the super admin role
    const filteredRoles = roles.filter((role) => role.name !== "super admin");

    res.status(200).json(filteredRoles);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// other role-related operations can be defined here
