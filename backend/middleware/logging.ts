import { Request, Response, NextFunction } from "express";
import Log from "../models/logModel";

const logAction = (action: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { method, originalUrl, params, body, user } = req;

      if (!user || !user.id) {
        return next();
      }

      const log = new Log({
        userId: user.id,
        action,
        method,
        endpoint: originalUrl,
        recordId: params.id || body._id || body.id,
        timestamp: new Date(),
      });

      await log.save();
    } catch (err) {
      console.error("Error logging action:", err);
    } finally {
      next();
    }
  };
};

export default logAction;
