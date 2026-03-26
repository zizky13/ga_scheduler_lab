import { singlePointCrossover } from "../../crossovers/singlePoint.js";
import { uniformCrossover } from "../../crossovers/uniform.js";
import { partiallyMappedCrossover } from "../../crossovers/partiallyMapped.js";
import { runGA, type GAResult } from "../../ga/runGA.js";
import { runPreGA } from "../../pre-ga/validator.js";
import { checkDiversity } from "../../ga/diversity.js";
import { prisma } from "../../db/client.js";
import type { Chromosome } from "../../ga/chromosome.js";
import type { PreGACandidate } from "../../pre-ga/candidate.js";

export type CrossoverType = "singlePoint" | "uniform" | "pmx";

export interface SchedulerConfig {
  populationSize?: number;
  generations?: number;
  tournamentSize?: number;
  mutationRate?: number;
  elitismCount?: number;
  crossover?: CrossoverType;
}

export interface ScheduledEntry {
  offeringId: number;
  courseName: string;
  roomId: number;
  roomName: string;
  lecturerIds: number[];
  lecturerNames: string[];
  timeSlotIds: number[];
  timeSlots: Array<{
    id: number;
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface ScheduleRunResult {
  crossoverUsed: CrossoverType;
  bestFitness: number;
  hardViolations: number;
  softPenalty: number;
  history: number[];
  avgHistory: number[];
  entries: ScheduledEntry[];
}

export interface SchedulerResponse {
  preGASummary: {
    feasible: number;
    infeasible: number;
    infeasibleDetails: { offeringId: number; reason: string }[];
  };
  diversity: {
    uniqueSlotCount: number;
    avgPoolSize: number;
    overlapDensity: number;
    rating: string;
  };
  config: Required<SchedulerConfig>;
  results: ScheduleRunResult[];
  bestResult: ScheduleRunResult;
}

const CROSSOVER_MAP = {
  singlePoint: singlePointCrossover,
  uniform: uniformCrossover,
  pmx: partiallyMappedCrossover,
} as const;

/**
 * Converts a raw GA chromosome into a rich ScheduledEntry[] that includes
 * human-readable course names, room names, lecturer names, and time-slot objects.
 */
async function chromosomeToEntries(
  chromosome: Chromosome,
  candidates: PreGACandidate[]
): Promise<ScheduledEntry[]> {
  const candidateMap = new Map(candidates.map((c) => [c.offeringId, c]));

  // Collect all referenced IDs for a single batch query
  const offeringIds = chromosome.map((g) => g.offeringId);
  const allTimeSlotIds = [...new Set(chromosome.flatMap((g) => g.assignedTimeSlotIds))];

  const [offerings, timeSlots] = await Promise.all([
    prisma.courseOffering.findMany({
      where: { id: { in: offeringIds } },
      include: {
        course: true,
        room: true,
        lecturers: { include: { lecturer: true } },
      },
    }),
    prisma.timeSlot.findMany({ where: { id: { in: allTimeSlotIds } } }),
  ]);

  const offeringMap = new Map(offerings.map((o) => [o.id, o]));
  const timeSlotMap = new Map(timeSlots.map((t) => [t.id, t]));

  const entries: ScheduledEntry[] = [];

  for (const gene of chromosome) {
    const offering = offeringMap.get(gene.offeringId);
    const candidate = candidateMap.get(gene.offeringId);
    if (!offering || !candidate) continue;

    const geneTimeSlots = gene.assignedTimeSlotIds
      .map((id) => timeSlotMap.get(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    entries.push({
      offeringId: offering.id,
      courseName: offering.course.name,
      roomId: candidate.roomId,
      roomName: offering.room?.name ?? "Unknown",
      lecturerIds: candidate.lecturerIds,
      lecturerNames: offering.lecturers.map((l) => l.lecturer.name),
      timeSlotIds: gene.assignedTimeSlotIds,
      timeSlots: geneTimeSlots.map((t) => ({
        id: t.id,
        day: t.day,
        startTime: t.startTime,
        endTime: t.endTime,
      })),
    });
  }

  return entries;
}

/**
 * runScheduler
 *
 * Orchestrates the full scheduling pipeline:
 *   1. Pre-GA validation
 *   2. Diversity check
 *   3. GA execution (one or more crossover strategies)
 *   4. Convert the best chromosome to a human-readable schedule
 */
export async function runScheduler(config: SchedulerConfig = {}): Promise<SchedulerResponse> {
  const resolvedConfig: Required<SchedulerConfig> = {
    populationSize: config.populationSize ?? 200,
    generations: config.generations ?? 70,
    tournamentSize: config.tournamentSize ?? 3,
    mutationRate: config.mutationRate ?? 0.3,
    elitismCount: config.elitismCount ?? 2,
    crossover: config.crossover ?? "singlePoint",
  };

  // Step 1: Pre-GA validation
  const preGAOutput = await runPreGA();
  const candidates = preGAOutput.feasible;

  // Step 2: Diversity check
  const diversity = checkDiversity(candidates);

  // Step 3: Build lecturer structural map
  const allLecturers = await prisma.lecturer.findMany();
  const lecturerStructuralMap = new Map<number, boolean>(
    allLecturers.map((l) => [l.id, l.isStructural])
  );

  // Step 4: Run GA with the specified crossover
  const crossoverType = resolvedConfig.crossover;
  const crossoverFn = CROSSOVER_MAP[crossoverType];

  const gaResult: GAResult = runGA(candidates, lecturerStructuralMap, {
    populationSize: resolvedConfig.populationSize,
    generations: resolvedConfig.generations,
    tournamentSize: resolvedConfig.tournamentSize,
    mutationRate: resolvedConfig.mutationRate,
    elitisimCount: resolvedConfig.elitismCount,
    crossover: crossoverFn,
  });

  // Step 5: Convert chromosome to human-readable entries
  const entries = await chromosomeToEntries(gaResult.bestChromosome, candidates);

  const runResult: ScheduleRunResult = {
    crossoverUsed: crossoverType,
    bestFitness: gaResult.bestFitness,
    hardViolations: gaResult.hardViolations,
    softPenalty: gaResult.softPenalty,
    history: gaResult.history,
    avgHistory: gaResult.avgHistory,
    entries,
  };

  return {
    preGASummary: {
      feasible: candidates.length,
      infeasible: preGAOutput.infeasible.length,
      infeasibleDetails: preGAOutput.infeasible,
    },
    diversity: {
      uniqueSlotCount: diversity.uniqueSlotCount,
      avgPoolSize: diversity.avgPoolSize,
      overlapDensity: diversity.overlapDensity,
      rating: diversity.rating,
    },
    config: resolvedConfig,
    results: [runResult],
    bestResult: runResult,
  };
}

/**
 * runMultiCrossoverScheduler
 *
 * Runs the GA with all three crossover operators and returns results for each.
 * Useful for comparing performance across strategies.
 */
export async function runMultiCrossoverScheduler(
  config: Omit<SchedulerConfig, "crossover"> = {}
): Promise<SchedulerResponse> {
  const resolvedConfig = {
    populationSize: config.populationSize ?? 200,
    generations: config.generations ?? 70,
    tournamentSize: config.tournamentSize ?? 3,
    mutationRate: config.mutationRate ?? 0.3,
    elitismCount: config.elitismCount ?? 2,
  };

  // Step 1: Pre-GA validation
  const preGAOutput = await runPreGA();
  const candidates = preGAOutput.feasible;

  // Step 2: Diversity check
  const diversity = checkDiversity(candidates);

  // Step 3: Build lecturer structural map
  const allLecturers = await prisma.lecturer.findMany();
  const lecturerStructuralMap = new Map<number, boolean>(
    allLecturers.map((l) => [l.id, l.isStructural])
  );

  const crossoverTypes: CrossoverType[] = ["singlePoint", "uniform", "pmx"];
  const runResults: ScheduleRunResult[] = [];

  for (const crossoverType of crossoverTypes) {
    const crossoverFn = CROSSOVER_MAP[crossoverType];
    const gaResult = runGA(candidates, lecturerStructuralMap, {
      populationSize: resolvedConfig.populationSize,
      generations: resolvedConfig.generations,
      tournamentSize: resolvedConfig.tournamentSize,
      mutationRate: resolvedConfig.mutationRate,
      elitisimCount: resolvedConfig.elitismCount,
      crossover: crossoverFn,
    });

    const entries = await chromosomeToEntries(gaResult.bestChromosome, candidates);

    runResults.push({
      crossoverUsed: crossoverType,
      bestFitness: gaResult.bestFitness,
      hardViolations: gaResult.hardViolations,
      softPenalty: gaResult.softPenalty,
      history: gaResult.history,
      avgHistory: gaResult.avgHistory,
      entries,
    });
  }

  // Best result = highest fitness (lowest violations)
  const bestResult = runResults.reduce((best, curr) =>
    curr.bestFitness > best.bestFitness ? curr : best
  );

  return {
    preGASummary: {
      feasible: candidates.length,
      infeasible: preGAOutput.infeasible.length,
      infeasibleDetails: preGAOutput.infeasible,
    },
    diversity: {
      uniqueSlotCount: diversity.uniqueSlotCount,
      avgPoolSize: diversity.avgPoolSize,
      overlapDensity: diversity.overlapDensity,
      rating: diversity.rating,
    },
    config: { ...resolvedConfig, crossover: "singlePoint" }, // placeholder
    results: runResults,
    bestResult,
  };
}
