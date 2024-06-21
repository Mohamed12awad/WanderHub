const Log = require("../models/logModel");

const logAction = (action) => {
  return async (req, res, next) => {
    const { method, originalUrl, params, body, user } = req;

    const log = new Log({
      userId: user._id,
      action,
      method,
      endpoint: originalUrl,
      recordId: params.id || body._id || body.id,
      timestamp: new Date(),
    });

    try {
      await log.save();
    } catch (err) {
      console.error("Error logging action:", err);
    }

    next();
  };
};

module.exports = logAction;
