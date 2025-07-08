import mongoose from "mongoose";

const ActionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_DELETED",
        "TASK_ASSIGNED",
        "TASK_STATUS_CHANGED",
      ],
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false,
    },
    details: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const ActionLog = mongoose.model("ActionLog", ActionLogSchema);
