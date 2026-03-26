import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/errorHandler.js";
import { body, validationResult } from "express-validator";
import { runScheduler, runMultiCrossoverScheduler, type CrossoverType, type SchedulerConfig } from "../services/scheduler.service.js";
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

/**
 * POST /api/scheduler/run
 *
 * Triggers a full GA scheduling run.
 *
 * Body (all optional, defaults applied):
 * {
 *   populationSize: number    // default 200
 *   generations: number       // default 70
 *   tournamentSize: number    // default 3
 *   mutationRate: number      // default 0.3  (0–1)
 *   elitismCount: number      // default 2
 *   crossover: string         // "singlePoint" | "uniform" | "pmx" (default "singlePoint")
 * }
 */
router.post(
  "/run",
  body("populationSize").optional().isInt({ min: 10, max: 2000 }),
  body("generations").optional().isInt({ min: 1, max: 500 }),
  body("tournamentSize").optional().isInt({ min: 2, max: 20 }),
  body("mutationRate").optional().isFloat({ min: 0, max: 1 }),
  body("elitismCount").optional().isInt({ min: 0, max: 20 }),
  body("crossover")
    .optional()
    .isIn(["singlePoint", "uniform", "pmx"])
    .withMessage("crossover must be one of: singlePoint, uniform, pmx"),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { populationSize, generations, tournamentSize, mutationRate, elitismCount, crossover } =
      req.body as {
        populationSize?: number;
        generations?: number;
        tournamentSize?: number;
        mutationRate?: number;
        elitismCount?: number;
        crossover?: CrossoverType;
      };

    const config: SchedulerConfig = {};
    if (populationSize !== undefined) config.populationSize = populationSize;
    if (generations !== undefined) config.generations = generations;
    if (tournamentSize !== undefined) config.tournamentSize = tournamentSize;
    if (mutationRate !== undefined) config.mutationRate = mutationRate;
    if (elitismCount !== undefined) config.elitismCount = elitismCount;
    if (crossover !== undefined) config.crossover = crossover;

    const result = await runScheduler(config);

    if (result.preGASummary.feasible === 0) {
      throw new AppError(
        "No feasible course offerings found. Please verify your data (rooms, lecturers, time slots).",
        422,
        "NO_FEASIBLE_CANDIDATES"
      );
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /api/scheduler/compare
 *
 * Runs the GA with all three crossover operators (Single Point, Uniform, PMX)
 * and returns results for each, plus the best overall result.
 * Useful for academic comparison / benchmarking.
 *
 * Body (all optional):
 * {
 *   populationSize: number
 *   generations: number
 *   tournamentSize: number
 *   mutationRate: number
 *   elitismCount: number
 * }
 */
router.post(
  "/compare",
  body("populationSize").optional().isInt({ min: 10, max: 2000 }),
  body("generations").optional().isInt({ min: 1, max: 500 }),
  body("tournamentSize").optional().isInt({ min: 2, max: 20 }),
  body("mutationRate").optional().isFloat({ min: 0, max: 1 }),
  body("elitismCount").optional().isInt({ min: 0, max: 20 }),
  asyncHandler(async (req, res) => {
    if (!handleValidation(req, res)) return;

    const { populationSize, generations, tournamentSize, mutationRate, elitismCount } =
      req.body as {
        populationSize?: number;
        generations?: number;
        tournamentSize?: number;
        mutationRate?: number;
        elitismCount?: number;
      };

    const config: Omit<SchedulerConfig, "crossover"> = {};
    if (populationSize !== undefined) config.populationSize = populationSize;
    if (generations !== undefined) config.generations = generations;
    if (tournamentSize !== undefined) config.tournamentSize = tournamentSize;
    if (mutationRate !== undefined) config.mutationRate = mutationRate;
    if (elitismCount !== undefined) config.elitismCount = elitismCount;

    const result = await runMultiCrossoverScheduler(config);

    if (result.preGASummary.feasible === 0) {
      throw new AppError(
        "No feasible course offerings found.",
        422,
        "NO_FEASIBLE_CANDIDATES"
      );
    }

    res.json({ success: true, data: result });
  })
);

export default router;
