import type { PreGACandidate } from "../pre-ga/candidate.js";

export interface Gene {
    offeringId : number;
    assignedTimeSlotIds: number[];
}

export type Chromosome = Gene[];

export function createRandomChromosome(
  candidates: PreGACandidate[]
): Chromosome {
  return candidates.map(candidate => {
    const shuffled = [...candidate.possibleTimeSlotIds]
      .sort(() => 0.5 - Math.random());

    return {
      offeringId: candidate.offeringId,
      assignedTimeSlotIds: shuffled.slice(0, candidate.requiredSessions),
    };
  });
}