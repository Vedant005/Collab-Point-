import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { ActionLog } from "../models/actionLog.model.js";

// Helper for title validation
const validateTaskTitle = async (title, taskId = null) => {
  const columnNames = ["Todo", "In Progress", "Done"];
  if (
    columnNames.map((name) => name.toLowerCase()).includes(title.toLowerCase())
  ) {
    // Case-insensitive check
    return {
      isValid: false,
      message: `Task title cannot be "${title}" (a column name).`,
    };
  }
  let query = { title: { $regex: new RegExp(`^${title}$`, "i") } }; // Case-insensitive unique check
  if (taskId) {
    query._id = { $ne: taskId };
  }
  const existingTask = await Task.findOne(query);
  if (existingTask) {
    return { isValid: false, message: "Task title must be unique." };
  }
  return { isValid: true };
};

// Helper for action logging (reusable)
const logAction = async (
  io,
  userId,
  username,
  actionType,
  taskId,
  details = {}
) => {
  try {
    const newLog = await ActionLog.create({
      userId,
      username,
      actionType,
      taskId,
      details,
    });
    // Emit real-time update for action logs
    io.emit("newActionLogEntry", newLog);
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({}).populate(
      "assignedUser",
      "username email"
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedUser",
      "username email"
    );
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { title, description, assignedUser, status, priority } = req.body;
  const io = req.app.get("socketio"); // Get Socket.IO instance

  const validation = await validateTaskTitle(title);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message });
  }

  try {
    const task = new Task({
      title,
      description,
      assignedUser,
      status,
      priority,
    });
    const createdTask = await task.save();
    const populatedTask = await Task.findById(createdTask._id).populate(
      "assignedUser",
      "username email"
    );

    await logAction(
      io,
      req.user._id,
      req.user.username,
      "TASK_CREATED",
      populatedTask._id,
      {
        title: populatedTask.title,
        status: populatedTask.status,
        assignedUser: populatedTask.assignedUser?.username || "Unassigned",
      }
    );

    io.emit("taskCreated", populatedTask); // Real-time update
    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an existing task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  const { title, description, assignedUser, status, priority, version } =
    req.body;
  const io = req.app.get("socketio");

  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // --- Conflict Handling ---
    if (task.version !== version) {
      return res.status(409).json({
        message: "Conflict: Task has been modified by another user.",
        latestTask: task.toObject(), // Convert Mongoose document to plain JS object
      });
    }

    // Prepare details for logging
    const logDetails = {};
    let actionType = "TASK_UPDATED"; // Default action type

    // Validate title if changed
    if (title && title.toLowerCase() !== task.title.toLowerCase()) {
      const validation = await validateTaskTitle(title, task._id);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.message });
      }
      logDetails.title = { oldValue: task.title, newValue: title };
      task.title = title;
    }

    if (description !== undefined && description !== task.description) {
      logDetails.description = {
        oldValue: task.description,
        newValue: description,
      };
      task.description = description;
    }

    if (
      assignedUser !== undefined &&
      String(assignedUser) !== String(task.assignedUser)
    ) {
      const oldAssignedUser = task.assignedUser
        ? await User.findById(task.assignedUser)
        : null;
      const newAssignedUser = assignedUser
        ? await User.findById(assignedUser)
        : null;

      logDetails.assignedUser = {
        oldValue: oldAssignedUser?.username || "Unassigned",
        newValue: newAssignedUser?.username || "Unassigned",
      };
      task.assignedUser = assignedUser;
      actionType = "TASK_ASSIGNED";
    }

    if (status && status !== task.status) {
      logDetails.status = { oldValue: task.status, newValue: status };
      task.status = status;
      actionType = "TASK_STATUS_CHANGED";
    }

    if (priority && priority !== task.priority) {
      logDetails.priority = { oldValue: task.priority, newValue: priority };
      task.priority = priority;
    }

    if (Object.keys(logDetails).length === 0) {
      return res.json(task.populate("assignedUser", "username email"));
    }

    task.version += 1;

    const updatedTask = await task.save();
    const populatedTask = await Task.findById(updatedTask._id).populate(
      "assignedUser",
      "username email"
    );

    await logAction(
      io,
      req.user._id,
      req.user.username,
      actionType,
      populatedTask._id,
      logDetails
    );

    io.emit("taskUpdated", populatedTask);
    res.json(populatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  const io = req.app.get("socketio");
  try {
    const task = await Task.findById(req.params.id);
    if (task) {
      const taskId = task._id;
      const taskTitle = task.title;

      await Task.deleteOne({ _id: req.params.id });

      await logAction(
        io,
        req.user._id,
        req.user.username,
        "TASK_DELETED",
        taskId,
        { title: taskTitle, status: task.status }
      );

      io.emit("taskDeleted", taskId);
      res.json({ message: "Task removed" });
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Smart Assign a task to the user with fewest active tasks
// @route   PUT /api/tasks/:id/smart-assign
// @access  Private
const smartAssignTask = async (req, res) => {
  const io = req.app.get("socketio");
  const taskId = req.params.id;
  const { version } = req.body;

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.version !== version) {
      return res.status(409).json({
        message: "Conflict: Task has been modified by another user.",
        latestTask: task.toObject(),
      });
    }

    const users = await User.find({});
    if (users.length === 0) {
      return res
        .status(400)
        .json({ message: "No users available for assignment." });
    }

    let fewestTasks = Infinity;
    let userWithFewestTasks = null;
    let currentActiveTaskCounts = [];

    for (const user of users) {
      const activeTasksCount = await Task.countDocuments({
        assignedUser: user._id,
        status: { $in: ["Todo", "In Progress"] },
      });
      currentActiveTaskCounts.push({
        username: user.username,
        count: activeTasksCount,
      });

      if (activeTasksCount < fewestTasks) {
        fewestTasks = activeTasksCount;
        userWithFewestTasks = user;
      }
    }

    if (!userWithFewestTasks) {
      return res
        .status(500)
        .json({ message: "Could not determine user for smart assignment." });
    }

    const oldAssignedUser = task.assignedUser
      ? await User.findById(task.assignedUser)
      : null;
    const oldAssignedUsername = oldAssignedUser?.username || "Unassigned";

    task.assignedUser = userWithFewestTasks._id;
    task.version += 1;
    const updatedTask = await task.save();

    const populatedTask = await Task.findById(updatedTask._id).populate(
      "assignedUser",
      "username email"
    );

    await logAction(
      io,
      req.user._id,
      req.user.username,
      "TASK_ASSIGNED",
      populatedTask._id,
      {
        taskTitle: populatedTask.title,
        oldAssignedUser: oldAssignedUsername,
        newAssignedUser: userWithFewestTasks.username,

        activeTaskCountsBeforeAssignment: currentActiveTaskCounts,
      }
    );

    io.emit("taskUpdated", populatedTask);
    res.json(populatedTask);
  } catch (error) {
    console.error("Error during smart assign:", error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  smartAssignTask,
};
