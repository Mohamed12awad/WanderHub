import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Role from "../models/roleModel";

const roles = [
  {
    name: "super admin",
    permissions: ["*"],
  },
  {
    name: "admin",
    permissions: [
      "contacts:view","contacts:create","contacts:edit","contacts:delete","contacts:export",
      "deals:view","deals:create","deals:edit","deals:delete","deals:export",
      "products:view","products:create","products:edit","products:delete",
      "expenses:view","expenses:create","expenses:edit","expenses:delete","expenses:approve",
      "tasks:view","tasks:create","tasks:edit","tasks:delete",
      "finance:view","finance:create","finance:edit","finance:delete","finance:approve",
      "reports:view","reports:export",
      "users:view","users:create","users:edit","users:delete",
      "roles:view","roles:manage",
      "settings:view","settings:manage",
      "logs:view",
    ],
  },
  {
    name: "manager",
    permissions: [
      "contacts:view","contacts:create","contacts:edit","contacts:export",
      "deals:view","deals:create","deals:edit","deals:export",
      "products:view","products:create","products:edit",
      "expenses:view","expenses:create","expenses:edit","expenses:approve",
      "tasks:view","tasks:create","tasks:edit","tasks:delete",
      "finance:view","finance:create","finance:edit",
      "reports:view","reports:export",
      "users:view",
      "settings:view",
    ],
  },
  {
    name: "viewer",
    permissions: [
      "contacts:view",
      "deals:view",
      "products:view",
      "expenses:view",
      "tasks:view",
      "finance:view",
      "reports:view",
    ],
  },
];

const seed = async () => {
  await mongoose.connect(process.env.uri as string);
  console.log("Connected — seeding roles...");

  for (const role of roles) {
    await Role.findOneAndUpdate(
      { name: role.name },
      { $set: { permissions: role.permissions } },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${role.name}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
};

seed().catch((e) => { console.error(e); process.exit(1); });
