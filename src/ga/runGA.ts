import { generateInitialPopulation } from "./population.js";
import { tournamentSelection } from "./selection.js";
import { evaluateFitness } from "./fitness.js";
import { mutateChromosome } from "./mutation.js";
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
    let population = generateInitialPopulation(candidates, config.populationSize);

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

            newPopulation.push(mutated1, mutated2);

            if (newPopulation.length < config.populationSize) {
                newPopulation.push(mutated2);
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