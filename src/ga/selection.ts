import type { Chromosome } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";
import { evaluateFitness } from "./fitness.js";

export function tournamentSelection(population: Chromosome[], candidates: PreGACandidate[], tournamentSize: number): Chromosome {
    let best: Chromosome | null = null;
    let bestFitness = -Infinity;

    for (let i = 0; i < tournamentSize; i++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        const contender = population[randomIndex]!;

        const { fitness } = evaluateFitness(contender, candidates);

        if (fitness > bestFitness) {
            bestFitness = fitness;
            best = contender;
        }
    }

    return best!;
}