import express from "express";
import cors from "cors";

const app = express();

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

// cron.schedule("*/14 * * * *", async () => {
//   try {
//     const response = await axios.get(`${process.env.BACKEND_URL}/health`);
//     console.log(`Health check response: ${response.status}`);
//   } catch (error) {
//     console.error(`Health check error: ${error.message}`);
//   }
// });

//routes import

import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users", userRouter);

app.get("/health", (req, res) => {
  res.send("OK");
});

export { app };
