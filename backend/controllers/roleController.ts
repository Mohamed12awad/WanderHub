import { Request, Response } from "express";
import Role from "../models/roleModel";

const PROTECTED_ROLES = ["super admin"];

export const getRoles = async (_req: Request, res: Response) => {
  try {
    const roles = await Role.find({ name: { $ne: "super admin" } });
    res.status(200).json(roles);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const createRole = async (req: Request, res: Response) => {
  const { name, permissions } = req.body as { name: string; permissions: string[] };
  try {
    const saved = await Role.create({ name: name.trim().toLowerCase(), permissions });
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body as { permissions: string[] };
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (PROTECTED_ROLES.includes(role.name)) {
      return res.status(403).json({ message: "Cannot modify protected roles" });
    }
    role.permissions = permissions;
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (PROTECTED_ROLES.includes(role.name)) {
      return res.status(403).json({ message: "Cannot delete protected roles" });
    }
    await role.deleteOne();
    res.json({ message: "Role deleted" });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
