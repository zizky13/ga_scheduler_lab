import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { hashPassword, revokeAllUserTokens } from "../services/authService.js";

const router = Router();

// All user management routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// ── Password complexity schema (reused for create & reset) ────────────────────
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const createUserSchema = z.object({
  username: z.string().min(3).max(50).trim(),
  email: z.string().email(),
  password: passwordSchema,
  role: z.enum(["ADMIN", "HEAD_OF_PROGRAM_STUDY"]).default("HEAD_OF_PROGRAM_STUDY"),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "HEAD_OF_PROGRAM_STUDY"]).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: users });
  })
);

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError("Invalid user id", 400, "INVALID_ID");

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    res.json({ success: true, data: user });
  })
);

// ── POST /api/users ───────────────────────────────────────────────────────────
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    const { username, email, password, role } = result.data;

    // Check uniqueness before hashing (cheap check first)
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });

    if (existing?.username === username) {
      throw new AppError("Username already taken", 409, "USERNAME_TAKEN");
    }
    if (existing?.email === email) {
      throw new AppError("Email already in use", 409, "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { username, email, passwordHash, role },
      select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  })
);

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError("Invalid user id", 400, "INVALID_ID");

    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    const { email, role, isActive } = result.data;

    // If deactivating, also revoke all tokens
    if (isActive === false) {
      await revokeAllUserTokens(id);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, username: true, email: true, role: true, isActive: true, updatedAt: true },
    });

    res.json({ success: true, data: updated });
  })
);

// ── PATCH /api/users/:id/password ─────────────────────────────────────────────
router.patch(
  "/:id/password",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError("Invalid user id", 400, "INVALID_ID");

    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: result.error.issues } });
      return;
    }

    const passwordHash = await hashPassword(result.data.newPassword);

    // Revoke all existing refresh tokens on password reset (security best practice)
    await revokeAllUserTokens(id);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.json({ success: true, message: "Password updated. All existing sessions have been invalidated." });
  })
);

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new AppError("Invalid user id", 400, "INVALID_ID");

    // Prevent admin from deleting their own account
    if (id === req.user!.id) {
      throw new AppError("You cannot delete your own account.", 400, "SELF_DELETE_FORBIDDEN");
    }

    // Revoke all sessions first
    await revokeAllUserTokens(id);

    // Soft-disable (preserve audit trail) — hard delete would lose history
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: "User account deactivated and all sessions revoked." });
  })
);

export default router;
