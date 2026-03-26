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

// ── GET /api/rooms ────────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { roomType } = req.query;
    const rooms = await prisma.room.findMany({
      ...(roomType ? { where: { roomType: String(roomType) } } : {}),
      include: { facilities: { include: { facility: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: rooms });
  })
);

// ── GET /api/rooms/:id ────────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const room = await prisma.room.findUnique({
      where: { id },
      include: { facilities: { include: { facility: true } } },
    });
    if (!room) throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    res.json({ success: true, data: room });
  })
);

// ── POST /api/rooms ───────────────────────────────────────────────────────────
router.post(
  "/",
  body("name").isString().trim().notEmpty(),
  body("capacity").isInt({ min: 1 }),
  body("roomType").isString().trim().notEmpty(),
  body("facilityIds").optional().isArray(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { name, capacity, roomType, facilityIds } = req.body as {
      name: string;
      capacity: number;
      roomType: string;
      facilityIds?: number[];
    };

    const room = await prisma.room.create({
      data: {
        name,
        capacity,
        roomType,
        ...(facilityIds && facilityIds.length > 0 && {
          facilities: {
            create: facilityIds.map((facilityId) => ({ facilityId })),
          },
        }),
      },
      include: { facilities: { include: { facility: true } } },
    });
    res.status(201).json({ success: true, data: room });
  })
);

// ── PUT /api/rooms/:id ────────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("name").optional().isString().trim().notEmpty(),
  body("capacity").optional().isInt({ min: 1 }),
  body("roomType").optional().isString().trim().notEmpty(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { name, capacity, roomType } = req.body as {
      name?: string;
      capacity?: number;
      roomType?: string;
    };
    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(capacity !== undefined && { capacity }),
        ...(roomType !== undefined && { roomType }),
      },
    });
    res.json({ success: true, data: room });
  })
);

// ── DELETE /api/rooms/:id ─────────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.room.delete({ where: { id } });
    res.json({ success: true, message: "Room deleted" });
  })
);

export default router;
