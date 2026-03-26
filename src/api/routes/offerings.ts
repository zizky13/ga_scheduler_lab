import { Router } from "express";
import { prisma } from "../../db/client.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { body, param, query, validationResult } from "express-validator";
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

// ── GET /api/offerings ────────────────────────────────────────────────────────
router.get(
  "/",
  query("academicYear").optional().isString(),
  query("semester").optional().isString(),
  asyncHandler(async (req, res) => {
    const { academicYear, semester } = req.query;
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(academicYear && { academicYear: String(academicYear) }),
        ...(semester && { semester: String(semester) }),
      },
      include: {
        course: { include: { programStudy: true } },
        room: true,
        lecturers: { include: { lecturer: true } },
      },
      orderBy: { id: "asc" },
    });
    res.json({ success: true, data: offerings });
  })
);

// ── GET /api/offerings/:id ────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const offering = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: { include: { programStudy: true, facilityRequirements: { include: { facility: true } } } },
        room: { include: { facilities: { include: { facility: true } } } },
        lecturers: { include: { lecturer: true } },
      },
    });
    if (!offering) throw new AppError("Offering not found", 404, "OFFERING_NOT_FOUND");
    res.json({ success: true, data: offering });
  })
);

// ── POST /api/offerings ───────────────────────────────────────────────────────
router.post(
  "/",
  body("courseId").isInt({ min: 1 }),
  body("academicYear").isString().trim().notEmpty(),
  body("semester").isString().trim().notEmpty(),
  body("effectiveStudentCount").isInt({ min: 1 }),
  body("totalSessions").isInt({ min: 1 }),
  body("isParallel").isBoolean(),
  body("roomId").optional().isInt({ min: 1 }),
  body("lecturerIds").isArray({ min: 1 }).withMessage("At least one lecturer is required"),
  body("lecturerIds.*").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const {
      courseId,
      academicYear,
      semester,
      effectiveStudentCount,
      totalSessions,
      isParallel,
      roomId,
      lecturerIds,
    } = req.body as {
      courseId: number;
      academicYear: string;
      semester: string;
      effectiveStudentCount: number;
      totalSessions: number;
      isParallel: boolean;
      roomId?: number;
      lecturerIds: number[];
    };

    const offering = await prisma.courseOffering.create({
      data: {
        courseId,
        academicYear,
        semester,
        effectiveStudentCount,
        totalSessions,
        isParallel,
        ...(roomId !== undefined && { roomId }),
        lecturers: {
          create: lecturerIds.map((lecturerId) => ({ lecturerId })),
        },
      },
      include: {
        course: true,
        room: true,
        lecturers: { include: { lecturer: true } },
      },
    });
    res.status(201).json({ success: true, data: offering });
  })
);

// ── PUT /api/offerings/:id ────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("academicYear").optional().isString().trim().notEmpty(),
  body("semester").optional().isString().trim().notEmpty(),
  body("effectiveStudentCount").optional().isInt({ min: 1 }),
  body("totalSessions").optional().isInt({ min: 1 }),
  body("isParallel").optional().isBoolean(),
  body("roomId").optional().isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { academicYear, semester, effectiveStudentCount, totalSessions, isParallel, roomId } =
      req.body as {
        academicYear?: string;
        semester?: string;
        effectiveStudentCount?: number;
        totalSessions?: number;
        isParallel?: boolean;
        roomId?: number;
      };
    const offering = await prisma.courseOffering.update({
      where: { id },
      data: {
        ...(academicYear !== undefined && { academicYear }),
        ...(semester !== undefined && { semester }),
        ...(effectiveStudentCount !== undefined && { effectiveStudentCount }),
        ...(totalSessions !== undefined && { totalSessions }),
        ...(isParallel !== undefined && { isParallel }),
        ...(roomId !== undefined && { roomId }),
      },
    });
    res.json({ success: true, data: offering });
  })
);

// ── DELETE /api/offerings/:id ─────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.courseOffering.delete({ where: { id } });
    res.json({ success: true, message: "Offering deleted" });
  })
);

// ── PATCH /api/offerings/:id/lecturers ────────────────────────────────────────
// Replace the lecturer list for an offering
router.patch(
  "/:id/lecturers",
  param("id").isInt({ min: 1 }),
  body("lecturerIds").isArray({ min: 1 }),
  body("lecturerIds.*").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { lecturerIds } = req.body as { lecturerIds: number[] };

    // Delete existing, then re-create
    await prisma.courseOfferingLecturer.deleteMany({ where: { offeringId: id } });
    const updated = await prisma.courseOffering.update({
      where: { id },
      data: {
        lecturers: {
          create: lecturerIds.map((lecturerId) => ({ lecturerId })),
        },
      },
      include: { lecturers: { include: { lecturer: true } } },
    });
    res.json({ success: true, data: updated });
  })
);

export default router;
