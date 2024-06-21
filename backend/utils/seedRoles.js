const mongoose = require("mongoose");
const Role = require("../models/roleModel");
const dbConfig = require("../config/database");

mongoose.connect(dbConfig.uri);

const roles = [
  { name: "admin", permissions: ["all"] },
  {
    name: "manager",
    permissions: ["manage-bookings", "manage-customers", "view-reports"],
  },
];

const seedRoles = async () => {
  try {
    await Role.insertMany(roles);
    console.log("Roles seeded successfully");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error seeding roles:", error);
    mongoose.disconnect();
  }
};

seedRoles();
