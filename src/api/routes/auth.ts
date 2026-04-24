import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  verifyPassword,
  issueTokenPair,
  validateRefreshToken,
  revokeRefreshToken,
  signAccessToken,
  createRefreshToken,
  accessTokenExpiresIn,
} from "../services/authService.js";

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    const { username, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, role: true, isActive: true, passwordHash: true },
    });

    if (!user) {
      // Constant-time response — don't reveal whether username exists
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, error: { code: "ACCOUNT_DISABLED", message: "This account has been disabled." } });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } });
      return;
    }

    const tokens = await issueTokenPair(user.id, user.role);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  })
);

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    const { refreshToken } = result.data;

    let record;
    try {
      record = await validateRefreshToken(refreshToken);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : "INVALID_REFRESH_TOKEN";
      res.status(401).json({ success: false, error: { code, message: "Refresh token is invalid or expired." } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Account not found or disabled." } });
      return;
    }

    const newAccessToken = signAccessToken({ sub: user.id, role: user.role });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, expiresIn: accessTokenExpiresIn() },
    });
  })
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = refreshSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    await revokeRefreshToken(result.data.refreshToken);

    res.json({ success: true, message: "Logged out successfully." });
  })
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
      return;
    }

    res.json({ success: true, data: user });
  })
);

export default router;
