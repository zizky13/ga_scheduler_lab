import { Router } from "express";
import { prisma } from "../../db/client.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { body, param, validationResult } from "express-validator";

const router = Router();

// ── Validation helpers ──────────────────────────────────────────────────────

function handleValidation(req: Parameters<typeof validationResult>[0], res: Parameters<typeof asyncHandler>[0] extends (...args: infer A) => unknown ? A[1] : never): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// ── GET /api/lecturers ────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const lecturers = await prisma.lecturer.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: lecturers });
  })
);

// ── GET /api/lecturers/:id ────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }).withMessage("id must be a positive integer"),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const lecturer = await prisma.lecturer.findUnique({ where: { id } });
    if (!lecturer) throw new AppError("Lecturer not found", 404, "LECTURER_NOT_FOUND");
    res.json({ success: true, data: lecturer });
  })
);

// ── POST /api/lecturers ───────────────────────────────────────────────────────
router.post(
  "/",
  body("name").isString().trim().notEmpty().withMessage("name is required"),
  body("isStructural").isBoolean().withMessage("isStructural must be a boolean"),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { name, isStructural } = req.body as { name: string; isStructural: boolean };
    const lecturer = await prisma.lecturer.create({ data: { name, isStructural } });
    res.status(201).json({ success: true, data: lecturer });
  })
);

// ── PUT /api/lecturers/:id ────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("name").optional().isString().trim().notEmpty(),
  body("isStructural").optional().isBoolean(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { name, isStructural } = req.body as { name?: string; isStructural?: boolean };
    const lecturer = await prisma.lecturer.update({
      where: { id },
      data: { ...(name !== undefined && { name }), ...(isStructural !== undefined && { isStructural }) },
    });
    res.json({ success: true, data: lecturer });
  })
);

// ── DELETE /api/lecturers/:id ─────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.lecturer.delete({ where: { id } });
    res.json({ success: true, message: "Lecturer deleted" });
  })
);

export default router;
