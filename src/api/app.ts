import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import "dotenv/config";

import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import lecturerRoutes from "./routes/lecturers.js";
import programRoutes from "./routes/programs.js";
import courseRoutes from "./routes/courses.js";
import roomRoutes from "./routes/rooms.js";
import facilityRoutes from "./routes/facilities.js";
import timeSlotRoutes from "./routes/timeSlots.js";
import offeringRoutes from "./routes/offerings.js";
import schedulerRoutes from "./routes/scheduler.js";

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate Limiting ────────────────────────────────────────────────────────────
// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Too many requests, slow down." } },
});

// Scheduler limiter — GA runs are expensive
const schedulerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_SCHEDULER_REQUESTS", message: "Too many scheduler requests. Please wait." } },
});

app.use("/api", apiLimiter);
app.use("/api/scheduler", schedulerLimiter);

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────

// Public: authentication (login, refresh, logout, me)
app.use("/api/auth", authRoutes);

// Admin-only: user management
app.use("/api/users", userRoutes);

// Domain routes — protected by role
// ADMIN → full access; HEAD_OF_PROGRAM_STUDY → courses + lecturers only
app.use("/api/lecturers", authenticate, authorize("ADMIN", "HEAD_OF_PROGRAM_STUDY"), lecturerRoutes);
app.use("/api/courses",   authenticate, authorize("ADMIN", "HEAD_OF_PROGRAM_STUDY"), courseRoutes);
app.use("/api/programs",  authenticate, authorize("ADMIN"), programRoutes);
app.use("/api/rooms",     authenticate, authorize("ADMIN"), roomRoutes);
app.use("/api/facilities",authenticate, authorize("ADMIN"), facilityRoutes);
app.use("/api/timeslots", authenticate, authorize("ADMIN"), timeSlotRoutes);
app.use("/api/offerings", authenticate, authorize("ADMIN"), offeringRoutes);
app.use("/api/scheduler", authenticate, authorize("ADMIN"), schedulerRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "The requested endpoint does not exist." },
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
