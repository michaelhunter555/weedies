import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import "./types/express";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import adminRoutes from "./routes/adminRoutes";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // eslint-disable-next-line no-console
  console.log(`[Socket] Connected: ${socket.id}`);
});

io.engine.on("connection_error", (err) => {
  // eslint-disable-next-line no-console
  console.log("Socket.IO server error:", err);
});

app.use("/socket.io", (_req, _res, next) => next());

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/product", productRoutes);
app.use("/api/admin", adminRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT) || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.log("MONGODB_URI environment variable is not set!");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Connected to MongoDB");
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`listening on port ${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log("Error connecting to MongoDB", err);
    process.exit(1);
  });


