import type { Chromosome } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export function mutateChromosome(chromosome: Chromosome, candidates: PreGACandidate[], mutationRate: number): Chromosome {
    const candidateMap = new Map(candidates.map(c => [c.offeringId, c]))

    return chromosome.map(gene => {
        if (Math.random() < mutationRate) {
            const candidate = candidateMap.get(gene.offeringId);
            if(!candidate) return gene;

            const shuffled = [...candidate.possibleTimeSlotIds].sort(() => 0.5 - Math.random());

            return {
                ...gene,
                assignedTimeSlotIds: shuffled.slice(0, candidate.requiredSessions)
                
            }
        }
        return gene;
    })
}