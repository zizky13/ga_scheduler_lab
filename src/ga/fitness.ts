import type { Chromosome } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export function evaluateFitness(
  chromosome: Chromosome,
  candidates: PreGACandidate[],
  lecturerStructuralMap: Map<number, boolean>
): FullFitnessResult {

  const hard = evaluateHardFitness(
    chromosome,
    candidates
  );

  const structuralPenalty =
    calculateStructuralPenalty(
      chromosome,
      candidates,
      lecturerStructuralMap
    );


  let fitness: number;
  // Lexicographic fitness
  if (hard.hardViolations > 0) {
    fitness = 1 / (1 + hard.hardViolations);
  } else {
    fitness = 2 + (1 / (1 + structuralPenalty));
  }

  // fitness lama, pakai alpha
  // const alpha = 0.2;
  // const fitness =
  //   1 / (
  //     1 +
  //     hard.hardViolations +
  //     alpha * structuralPenalty
  //   );

  return {
    fitness,
    hardViolations: hard.hardViolations,
    softPenalty: structuralPenalty
  };
}


export function calculateStructuralPenalty(
  chromosome: Chromosome,
  candidates: PreGACandidate[],
  lecturerStructuralMap: Map<number, boolean>
) {

  const candidateMap = new Map(
    candidates.map(c => [c.offeringId, c])
  );

  const lecturerSessionCount = new Map<number, number>();

  for (const gene of chromosome) {

    const candidate = candidateMap.get(gene.offeringId);
    if (!candidate) continue;

    const sessionCount = gene.assignedTimeSlotIds.length;

    for (const lecturerId of candidate.lecturerIds) {

      const current =
        lecturerSessionCount.get(lecturerId) || 0;

      lecturerSessionCount.set(
        lecturerId,
        current + sessionCount
      );
    }
  }

  let penalty = 0;

  const preferredLoadStructural = 2;

  for (const [lecturerId, sessions] of lecturerSessionCount) {

    const isStructural = lecturerStructuralMap.get(lecturerId);

    if (isStructural) {
      penalty += Math.max(
        0,
        sessions - preferredLoadStructural
      );
    }
  }

  return penalty;
}

export function evaluateHardFitness(chromosome: Chromosome, candidates: PreGACandidate[]): FitnessResult {
  let hardViolations = 0;

  const candidateMap = new Map(candidates.map(c => [c.offeringId, c]));

  const roomTimeMap = new Map<string, number>();
  const lecturerTimeMap = new Map<string, number>();

  for (const gene of chromosome) {
    const candidate = candidateMap.get(gene.offeringId);
    if (!candidate) continue;

    const { roomId, lecturerIds } = candidate;

    for (const timeSlotId of gene.assignedTimeSlotIds) {

      const roomKey = `${roomId}-${timeSlotId}`;
      roomTimeMap.set(roomKey, (roomTimeMap.get(roomKey) || 0) + 1);

      for (const lecturerId of lecturerIds) {
        const lecturerKey = `${lecturerId}-${timeSlotId}`;
        lecturerTimeMap.set(lecturerKey, (lecturerTimeMap.get(lecturerKey) || 0) + 1);
      }
    }
  }

  for (const count of roomTimeMap.values()) {
    if (count > 1) hardViolations += (count - 1);
  }

  for (const count of lecturerTimeMap.values()) {
    if (count > 1) hardViolations += (count - 1);
  }

  const fitness = 1 / (1 + hardViolations);

  return { fitness, hardViolations };
}


export interface FitnessResult {
  fitness: number;
  hardViolations: number;
}

export interface FullFitnessResult extends FitnessResult {
  softPenalty: number;
}