import { ZodSchema } from "zod/v4";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return res.status(422).json({ message: "Validation failed", errors });
    }
    req.body = result.data;
    next();
  };
};
