import type { Chromosome } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export interface FitnessResult {
    fitness: number;
    hardViolations: number;
}

export function evaluateFitness(chromosome: Chromosome, candidates: PreGACandidate[]): FitnessResult {
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

            for (const lecturerId of lecturerIds){
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