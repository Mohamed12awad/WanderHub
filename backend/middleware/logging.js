const Log = require("../models/logModel");

const logAction = (action) => {
  return async (req, res, next) => {
    try {
      const { method, originalUrl, params, body, user } = req;

      // Ensure the user is logged in before logging the action
      if (!user || !user._id) {
        return next();
      }

      const log = new Log({
        userId: user._id,
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
      // Ensure the next middleware or route handler is called regardless of the outcome
      next();
    }
  };
};

module.exports = logAction;
