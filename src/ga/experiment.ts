import { generateInitialPopulation } from "./population.js";
import { tournamentSelection } from "./selection.js";
import { evaluateFitness } from "./fitness.js";
import type { CrossoverOperator } from "./types.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

export function runOneGeneration(candidates: PreGACandidate[], crossover: CrossoverOperator, populationSize = 50) {
    const population = generateInitialPopulation(candidates, populationSize);

    const newPopulation = [];

    for (let i = 0; i < populationSize / 2; i++) {
        const parent1 = tournamentSelection(population, candidates, 3);
        const parent2 = tournamentSelection(population, candidates, 3);

        const [child1, child2] = crossover(parent1, parent2);

        newPopulation.push(child1, child2);
    }

    const fitnessValue = newPopulation.map(ch => evaluateFitness(ch, candidates).fitness);

    const bestFitness = Math.max(...fitnessValue);

    return bestFitness;
 }