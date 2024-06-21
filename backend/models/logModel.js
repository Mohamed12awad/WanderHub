const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const logSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  method: { type: String, required: true },
  endpoint: { type: String, required: true },
  recordId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Log", logSchema);
