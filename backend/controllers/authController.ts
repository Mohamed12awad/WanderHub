import { Request, Response } from "express";
import User from "../models/userModel";
import { generateToken } from "../middleware/auth";

export const signup = async (req: Request, res: Response) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  try {
    const user = await User.findOne({ email })
      .populate<{ role: { name: string; permissions: string[] } }>("role")
      .select("+password");

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.active === false) return res.status(400).json({ message: "User is Blocked" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const role = user.role as { name: string; permissions: string[] };
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: role.name,
        permissions: role.permissions ?? [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
