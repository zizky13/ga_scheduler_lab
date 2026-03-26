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

// ── GET /api/timeslots ────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { day } = req.query;
    const timeSlots = await prisma.timeSlot.findMany({
      ...(day ? { where: { day: String(day) } } : {}),
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });
    res.json({ success: true, data: timeSlots });
  })
);

// ── GET /api/timeslots/:id ────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const slot = await prisma.timeSlot.findUnique({ where: { id } });
    if (!slot) throw new AppError("TimeSlot not found", 404, "TIMESLOT_NOT_FOUND");
    res.json({ success: true, data: slot });
  })
);

// ── POST /api/timeslots ───────────────────────────────────────────────────────
router.post(
  "/",
  body("day").isString().trim().notEmpty(),
  body("startTime").isString().trim().notEmpty(),
  body("endTime").isString().trim().notEmpty(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { day, startTime, endTime } = req.body as {
      day: string;
      startTime: string;
      endTime: string;
    };
    const slot = await prisma.timeSlot.create({ data: { day, startTime, endTime } });
    res.status(201).json({ success: true, data: slot });
  })
);

// ── PUT /api/timeslots/:id ────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("day").optional().isString().trim().notEmpty(),
  body("startTime").optional().isString().trim().notEmpty(),
  body("endTime").optional().isString().trim().notEmpty(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { day, startTime, endTime } = req.body as {
      day?: string;
      startTime?: string;
      endTime?: string;
    };
    const slot = await prisma.timeSlot.update({
      where: { id },
      data: {
        ...(day !== undefined && { day }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
      },
    });
    res.json({ success: true, data: slot });
  })
);

// ── DELETE /api/timeslots/:id ─────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.timeSlot.delete({ where: { id } });
    res.json({ success: true, message: "TimeSlot deleted" });
  })
);

export default router;
