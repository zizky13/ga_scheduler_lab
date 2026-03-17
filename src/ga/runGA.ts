import { generateInitialPopulation } from "./population.js";
import { tournamentSelection } from "./selection.js";
import { evaluateFitness } from "./fitness.js";
import { mutateChromosome } from "./mutation.js";
// Import the conflict-aware repair function that resolves hard violations post-crossover
import { repairChromosome } from "./repair.js";
import type { CrossoverOperator } from "./types.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";
import type { Chromosome } from "./chromosome.js";

interface GAConfig {
    populationSize: number;
    generations: number;
    tournamentSize: number;
    mutationRate: number;
    elitisimCount: number;
    crossover: CrossoverOperator;
}

export interface GAResult {
    /** Best fitness value recorded at each generation. */
    history: number[];
    /** Average fitness value recorded at each generation. */
    avgHistory: number[];
    /** The best chromosome found across all generations. */
    bestChromosome: Chromosome;
    /** Fitness of the best chromosome. */
    bestFitness: number;
    /** Hard constraint violations of the best chromosome. */
    hardViolations: number;
    /** Soft penalty score of the best chromosome. */
    softPenalty: number;
}

export function runGA(
    candidates: PreGACandidate[],
    lecturerStructuralMap: Map<number, boolean>,
    config: GAConfig
): GAResult {
    // Generate the initial population and immediately repair any conflicts present
    // in randomly created chromosomes before evolution begins
    let population = generateInitialPopulation(candidates, config.populationSize).map(
        ch => repairChromosome(ch, candidates)
    );

    const history: number[] = [];
    const avgHistory: number[] = [];

    let overallBest: GAResult["bestChromosome"] | null = null;
    let overallBestFitness = -Infinity;
    let overallHardViolations = 0;
    let overallSoftPenalty = 0;

    for (let gen = 0; gen < config.generations; gen++) {
        const evaluated = population.map(ch => {
            const result = evaluateFitness(ch, candidates, lecturerStructuralMap);
            return {
                chromosome: ch,
                fitness: result.fitness,
                hardViolations: result.hardViolations,
                softPenalty: result.softPenalty,
            };
        });
        evaluated.sort((a, b) => b.fitness - a.fitness);

        const best = evaluated[0]!;
        const avgFitness = evaluated.reduce((sum, e) => sum + e.fitness, 0) / evaluated.length;

        console.log(
            `Gen ${gen + 1} | best=${best.fitness.toFixed(4)} | avg=${avgFitness.toFixed(4)} | hard=${best.hardViolations} | soft=${best.softPenalty}`
        );

        history.push(best.fitness);
        avgHistory.push(avgFitness);

        if (best.fitness > overallBestFitness) {
            overallBestFitness = best.fitness;
            overallBest = best.chromosome;
            overallHardViolations = best.hardViolations;
            overallSoftPenalty = best.softPenalty;
        }

        const newPopulation: Chromosome[] = [];

        // Elitism
        for (let i = 0; i < config.elitisimCount; i++) {
            newPopulation.push(evaluated[i]!.chromosome);
        }

        while (newPopulation.length < config.populationSize) {
            const parent1 = tournamentSelection(population, candidates, config.tournamentSize);
            const parent2 = tournamentSelection(population, candidates, config.tournamentSize);

            const [child1, child2] = config.crossover(parent1, parent2);

            const mutated1 = mutateChromosome(child1, candidates, config.mutationRate);
            const mutated2 = mutateChromosome(child2, candidates, config.mutationRate);

            // Apply conflict-aware repair to each offspring: resolves room-time and
            // lecturer-time collisions greedily before the offspring enter the next
            // generation's fitness evaluation, accelerating convergence on hard=0
            const repaired1 = repairChromosome(mutated1, candidates);
            const repaired2 = repairChromosome(mutated2, candidates);

            newPopulation.push(repaired1, repaired2);

            if (newPopulation.length < config.populationSize) {
                newPopulation.push(repaired2);
            }
        }

        population = newPopulation;
    }

    return {
        history,
        avgHistory,
        bestChromosome: overallBest!,
        bestFitness: overallBestFitness,
        hardViolations: overallHardViolations,
        softPenalty: overallSoftPenalty,
    };
}