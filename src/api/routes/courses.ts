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

// ── GET /api/courses ──────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { programStudyId } = req.query;
    const courses = await prisma.course.findMany({
      ...(programStudyId ? { where: { programStudyId: Number(programStudyId) } } : {}),
      include: {
        programStudy: true,
        facilityRequirements: { include: { facility: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: courses });
  })
);

// ── GET /api/courses/:id ──────────────────────────────────────────────────────
router.get(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        programStudy: true,
        facilityRequirements: { include: { facility: true } },
        offerings: true,
      },
    });
    if (!course) throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    res.json({ success: true, data: course });
  })
);

// ── POST /api/courses ─────────────────────────────────────────────────────────
router.post(
  "/",
  body("name").isString().trim().notEmpty(),
  body("credits").isInt({ min: 1 }),
  body("requiresSpecialRoom").isBoolean(),
  body("programStudyId").isInt({ min: 1 }),
  body("facilityIds").optional().isArray(),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const { name, credits, requiresSpecialRoom, programStudyId, facilityIds } =
      req.body as {
        name: string;
        credits: number;
        requiresSpecialRoom: boolean;
        programStudyId: number;
        facilityIds?: number[];
      };

    const course = await prisma.course.create({
      data: {
        name,
        credits,
        requiresSpecialRoom,
        programStudyId,
        ...(facilityIds && facilityIds.length > 0 && {
          facilityRequirements: {
            create: facilityIds.map((facilityId) => ({ facilityId })),
          },
        }),
      },
      include: {
        facilityRequirements: { include: { facility: true } },
      },
    });
    res.status(201).json({ success: true, data: course });
  })
);

// ── PUT /api/courses/:id ──────────────────────────────────────────────────────
router.put(
  "/:id",
  param("id").isInt({ min: 1 }),
  body("name").optional().isString().trim().notEmpty(),
  body("credits").optional().isInt({ min: 1 }),
  body("requiresSpecialRoom").optional().isBoolean(),
  body("programStudyId").optional().isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    const { name, credits, requiresSpecialRoom, programStudyId } = req.body as {
      name?: string;
      credits?: number;
      requiresSpecialRoom?: boolean;
      programStudyId?: number;
    };
    const course = await prisma.course.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(credits !== undefined && { credits }),
        ...(requiresSpecialRoom !== undefined && { requiresSpecialRoom }),
        ...(programStudyId !== undefined && { programStudyId }),
      },
    });
    res.json({ success: true, data: course });
  })
);

// ── DELETE /api/courses/:id ───────────────────────────────────────────────────
router.delete(
  "/:id",
  param("id").isInt({ min: 1 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;
    const id = Number(req.params.id);
    await prisma.course.delete({ where: { id } });
    res.json({ success: true, message: "Course deleted" });
  })
);

export default router;
