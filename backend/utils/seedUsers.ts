import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Role from "../models/roleModel";
import User from "../models/userModel";

const users = [
  {
    name: "Super Admin",
    email: "superadmin@wonderhub.com",
    phone: "01000000001",
    password: "Wonder@123",
    roleName: "super admin",
  },
  {
    name: "Admin User",
    email: "admin@wonderhub.com",
    phone: "01000000002",
    password: "Wonder@123",
    roleName: "admin",
  },
  {
    name: "Manager User",
    email: "manager@wonderhub.com",
    phone: "01000000003",
    password: "Wonder@123",
    roleName: "manager",
  },
  {
    name: "Viewer User",
    email: "viewer@wonderhub.com",
    phone: "01000000004",
    password: "Wonder@123",
    roleName: "viewer",
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.uri as string);
    console.log("Connected to MongoDB");

    // Look up roles by name — permissions are managed by seed:roles
    const roleMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const roleName of ["super admin", "admin", "manager", "viewer"]) {
      const doc = await Role.findOne({ name: roleName });
      if (!doc) {
        console.error(`  [error] Role "${roleName}" not found — run npm run seed:roles first`);
        continue;
      }
      roleMap[roleName] = doc._id as mongoose.Types.ObjectId;
      console.log(`  Role found: ${roleName}`);
    }

    console.log("\nUsers:");
    for (const u of users) {
      const roleId = roleMap[u.roleName];
      if (!roleId) {
        console.log(`  [skip] ${u.email} — role "${u.roleName}" not found`);
        continue;
      }

      const existing = await User.findOne({ email: u.email.toLowerCase() });
      if (existing) {
        // Update role assignment in case it changed
        await User.updateOne({ _id: existing._id }, { $set: { role: roleId } });
        console.log(`  [updated] ${u.email}  role=${u.roleName}`);
        continue;
      }

      await User.create({
        name: u.name,
        email: u.email.toLowerCase(),
        phone: u.phone,
        password: u.password,
        role: roleId,
        active: true,
      });
      console.log(`  [created] ${u.email}  role=${u.roleName}  password=Wonder@123`);
    }

    console.log("\nDone. All users must re-login to receive updated permissions in their JWT.");
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
