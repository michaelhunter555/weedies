import mongoose from "mongoose";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import "./types/express";
import userRoutes from "./routes/userRoutes";
import listingsRoutes from "./routes/listingRoutes";
import stripeRoutes from "./routes/stripeRoutes";
import adminRoutes from "./routes/adminRoutes";
import integrationRoutes from "./routes/integrationRoutes";
import chatRoutes from "./routes/chatRoutes";
import supportRoutes from "./routes/supportRoutes";
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
 * Unauthenticated sockets are rejected - every event we emit is targeted to
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

/** Comma-separated in .env, e.g. `http://localhost:3000,http://localhost:3001` */
function allowedCorsOrigins(): string | string[] {
  if(process.env.NODE_ENV === "production") {
    return ["https://dapandflip.com", "https://www.dapandflip.com"]
  }
  return ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
}

app.use(
  cors({
    origin: allowedCorsOrigins(),
    credentials: true,
  })
);
/**
 * Stripe needs the **raw** JSON body for `stripe-signature` verification.
 * - Skip `express.json()` for our webhook paths (query strings / trailing
 *   slashes must still match — Stripe or proxies sometimes vary the URL).
 * - Do **not** register a second global `express.json()` after this; it would
 *   parse the body before `express.raw()` in the Stripe router runs.
 */
/** Paths must match Stripe Dashboard + skip global `express.json()` so `express.raw()` can verify signatures. */
const STRIPE_WEBHOOK_FULL_PATHS = new Set([
  "/api/stripe/app-webhook",
  "/api/stripe/app-webhooks",
  "/api/stripe/v2-webhook",
]);

function isStripeWebhookRequest(req: express.Request): boolean {
  const path = (req.originalUrl || req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  return STRIPE_WEBHOOK_FULL_PATHS.has(path);
}

app.use((req, res, next) => {
  if (isStripeWebhookRequest(req)) {
    return next();
  }
  return express.json()(req, res, next);
});

app.use("/api/user", userRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/integrations", integrationRoutes);
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


