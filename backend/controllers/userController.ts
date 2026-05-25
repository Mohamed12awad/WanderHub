import { Request, Response } from "express";
import User from "../models/userModel";
import bcrypt from "bcryptjs";

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, { properties: { path: string; message: string } }>;
}

const handleError = (err: MongoError) => {
  const errors: Record<string, string> = {};
  if (err.code === 11000) {
    if (err.keyPattern?.email) errors.email = "Email already exists.";
    if (err.keyPattern?.username) errors.username = "Username exists.";
    return errors;
  }
  if (err.message?.includes("User validation failed") && err.errors) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    const errMsg = handleError(error as MongoError);
    res.status(400).json({ errMsg });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await User.find().populate("role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).populate("role", "name");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, role, ...updateData } = req.body as {
      password?: string;
      role?: string;
      [key: string]: unknown;
    };

    if (role) {
      const user = await User.findById(id).populate<{ role: { name: string } }>("role");
      if (!user) return res.status(404).json({ message: "User not found" });

      (updateData as Record<string, unknown>).role = role;
      const roleName = (user.role as { name: string }).name;
      if (
        (roleName === "super admin" || role === "super admin") &&
        req.user!.role !== "super admin"
      ) {
        return res.status(403).json({ message: "Access denied. Super admin only." });
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt();
      (updateData as Record<string, unknown>).password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    const errMsg = handleError(error as MongoError);
    res.status(400).json({ errMsg });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id, role } = req.body as { id: string; role: string };
    const user = await User.findById(id).populate<{ role: { name: string } }>("role");
    if (!user) return res.status(404).json({ message: "User not found" });

    const roleName = (user.role as { name: string }).name;
    if (
      (roleName === "super admin" || role === "super admin") &&
      req.user!.role !== "super admin"
    ) {
      return res.status(403).json({ message: "Access denied. Super admin only." });
    }

    user.role = role as never;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const updateUserActiveState = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.active = !user.active;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).populate<{ role: { name: string } }>(
      "role",
      "name"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    if ((user.role as { name: string }).name === "super admin") {
      return res.status(403).json({ message: "Cannot delete super admin" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};
