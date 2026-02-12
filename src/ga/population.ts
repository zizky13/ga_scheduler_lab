import { type Chromosome, createRandomChromosome } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export function generateInitialPopulation(candidates: PreGACandidate[], populationSize: number): Chromosome[] {
    const population: Chromosome[] = [];

    for (let i = 0; i < populationSize; i++){
        const chromosome = createRandomChromosome(candidates);
        population.push(chromosome);
    }
    return population;
}