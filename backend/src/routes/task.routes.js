import express from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  smartAssignTask,
} from "../controller/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All task routes are verifyJWTed
router.route("/").get(verifyJWT, getTasks).post(verifyJWT, createTask);

router
  .route("/:id")
  .get(verifyJWT, getTaskById)
  .put(verifyJWT, updateTask)
  .delete(verifyJWT, deleteTask);

router.put("/:id/smart-assign", verifyJWT, smartAssignTask);

export default router;
