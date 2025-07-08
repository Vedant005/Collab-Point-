import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true }, // Uniqueness validation for board later
    description: { type: String },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Todo", "In Progress", "Done"],
      default: "Todo",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Task = mongoose.model("Task", TaskSchema);
