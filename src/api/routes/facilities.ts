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

// ── GET /api/facilities ───────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const facilities = await prisma.facility.findMany({ orderBy: { name: "asc" } });
    res.json({ success: true, data: facilities });
  })
);

// ── GET /api/facilities/:id ───────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const facility = await prisma.facility.findUnique({ where: { id } });
    if (!facility) throw new AppError("Facility not found", 404, "FACILITY_NOT_FOUND");
    res.json({ success: true, data: facility });
  })
);

// ── POST /api/facilities ──────────────────────────────────────────────────────
router.post(
  "/",
  body("name").isString().trim().notEmpty(),
  body("description").optional().isString(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { name, description } = req.body as { name: string; description?: string };
    const facility = await prisma.facility.create({ data: { name, description: description ?? null } });
    res.status(201).json({ success: true, data: facility });
  })
);

// ── PUT /api/facilities/:id ───────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("name").optional().isString().trim().notEmpty(),
  body("description").optional().isString(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { name, description } = req.body as { name?: string; description?: string };
    const facility = await prisma.facility.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
    res.json({ success: true, data: facility });
  })
);

// ── DELETE /api/facilities/:id ────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.facility.delete({ where: { id } });
    res.json({ success: true, message: "Facility deleted" });
  })
);

export default router;
