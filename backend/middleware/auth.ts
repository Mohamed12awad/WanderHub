import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Permission } from "../config/permissions";

dotenv.config();

export const generateToken = (user: {
  _id: unknown;
  role: unknown;
}) => {
  const role = user.role as { name: string; permissions: string[] };
  return jwt.sign(
    { id: user._id, role: role.name, permissions: role.permissions ?? [] },
    process.env.JWT_SECRET as string,
    { expiresIn: "8h" }
  );
};

export const requireSignin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    token = authHeader;
  }

  if (!token) return res.status(401).json({ message: "Authorization required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      role: string;
      permissions: string[];
    };
    req.user = { id: decoded.id, role: decoded.role, permissions: decoded.permissions ?? [] };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/** Permission-based guard — reads from JWT payload, no DB hit. */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const perms = req.user?.permissions ?? [];
    if (perms.includes("*") || perms.includes(permission)) return next();
    return res.status(403).json({ message: `Permission denied: ${permission}` });
  };
};

/** @deprecated Use requirePermission. Kept for gradual migration. */
export const isAuthorized = (role: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(403).json({ message: "Access denied" });
    if (userRole === "super admin") return next();
    const roles = Array.isArray(role) ? role : [role];
    if (roles.includes("all") || roles.includes(userRole)) return next();
    return res.status(403).json({ message: "Access denied" });
  };
};
