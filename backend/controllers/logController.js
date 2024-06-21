const Log = require("../models/logModel");

exports.getLogs = async (req, res) => {
  try {
    const { user, action, startDate, endDate, recordId } = req.query;
    const query = {};

    if (user) query.user = user;
    if (action) query.action = action;
    if (recordId) query.recordId = recordId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await Log.find(query).populate("user", "name email");
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
