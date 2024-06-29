// controllers/summeryController.js
const summeryService = require("../utils/summeryServices");

const getSummeryData = async (req, res) => {
  const { timePeriod } = req.query;
  try {
    const data = await summeryService.getSummeryData(timePeriod);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSummeryData,
};
