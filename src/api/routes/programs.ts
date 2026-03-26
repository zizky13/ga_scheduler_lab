import { Router } from "express";
import { prisma } from "../../db/client.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { body, param, validationResult } from "express-validator";
import type { Request, Response } from "express";

const router = Router();

function handleValidation(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

// ── GET /api/programs ─────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const programs = await prisma.programStudy.findMany({
      include: { courses: true },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: programs });
  })
);

// ── GET /api/programs/:id ─────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const program = await prisma.programStudy.findUnique({
      where: { id },
      include: { courses: true },
    });
    if (!program) throw new AppError("Program study not found", 404, "PROGRAM_NOT_FOUND");
    res.json({ success: true, data: program });
  })
);

// ── POST /api/programs ────────────────────────────────────────────────────────
router.post(
  "/",
  body("name").isString().trim().notEmpty(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { name } = req.body as { name: string };
    const program = await prisma.programStudy.create({ data: { name } });
    res.status(201).json({ success: true, data: program });
  })
);

// ── PUT /api/programs/:id ─────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("name").isString().trim().notEmpty(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { name } = req.body as { name: string };
    const program = await prisma.programStudy.update({ where: { id }, data: { name } });
    res.json({ success: true, data: program });
  })
);

// ── DELETE /api/programs/:id ──────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.programStudy.delete({ where: { id } });
    res.json({ success: true, message: "Program study deleted" });
  })
);

export default router;
