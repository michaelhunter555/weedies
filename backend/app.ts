import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import "./types/express";
import userRoutes from "./routes/userRoutes";
import listingsRoutes from "./routes/listingRoutes";
import stripeRoutes from "./routes/stripeRoutes";
import adminRoutes from "./routes/adminRoutes";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken } from "./lib/jwt";

dotenv.config();

const app = express();
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

/**
 * Socket.IO handshake auth.
 *
 * The client opens the socket with `io(url, { auth: { token }})`. We verify
 * that token here and attach the user's id to the socket so downstream
 * emitters (`io.to(userId).emit(...)`) actually reach the right client.
 *
 * Unauthenticated sockets are rejected — every event we emit is targeted to
 * a specific user, so anonymous connections have nothing to listen to.
 */
io.use((socket, next) => {
  const raw =
    (socket.handshake.auth as { token?: string } | undefined)?.token ||
    (socket.handshake.headers?.authorization as string | undefined)?.replace(
      /^Bearer\s+/i,
      "",
    );

  if (!raw) {
    return next(new Error("Missing auth token"));
  }

  try {
    const payload = verifyAccessToken(raw);
    (socket.data as { userId?: string; role?: string }).userId = String(
      payload.sub,
    );
    (socket.data as { userId?: string; role?: string }).role = payload.role;
    return next();
  } catch {
    return next(new Error("Invalid auth token"));
  }
});

io.on("connection", (socket: Socket) => {
  const userId = (socket.data as { userId?: string }).userId;
  if (userId) {
    socket.join(userId);
    // eslint-disable-next-line no-console
    console.log(`[Socket] Connected: ${socket.id} → user:${userId}`);
  }

  socket.on("disconnect", (reason) => {
    // eslint-disable-next-line no-console
    console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
  });
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
app.use((req, res, next) => {
  if (
    req.originalUrl === "/api/stripe/app-webhook" ||
    req.originalUrl === "/api/stripe/v2-webhook"
  ) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/stripe", stripeRoutes);
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


