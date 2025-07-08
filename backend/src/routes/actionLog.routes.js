import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getActionLogs } from "../controller/actionLog.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getActionLogs);

export default router;
