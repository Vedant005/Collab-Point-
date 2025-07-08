import { ActionLog } from "../models/actionLog.model.js";

// @desc    Get last 20 action logs
// @route   GET /api/actions
// @access  Private
const getActionLogs = async (req, res) => {
  try {
    const actions = await ActionLog.find({}).sort({ createdAt: -1 }).limit(20);
    res.json(actions);
  } catch (error) {
    console.error("Error fetching action logs:", error);
    res.status(500).json({ message: "Failed to fetch action logs" });
  }
};

export { getActionLogs };
