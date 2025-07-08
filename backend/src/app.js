import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
const app = express();

const httpServer = createServer(app);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

app.set("socketio", io);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//routes import

import userRouter from "./routes/user.routes.js";
import taskRoutes from "./routes/task.routes.js";
import actionLogRoutes from "./routes/actionLog.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/action", actionLogRoutes);

app.get("/health", (req, res) => {
  res.send("OK");
});

export { app };
