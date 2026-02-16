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

export function runGA(candidates: PreGACandidate[], config: GAConfig) {
    let population = generateInitialPopulation(candidates, config.populationSize);

    const history: number[] = [];

    for (let gen = 0; gen < config.generations; gen++) {
        // eval fitness
        const evaluated = population.map(ch => ({
            chromosome: ch,
            fitness: evaluateFitness(ch, candidates).fitness
        }))

        evaluated.sort((a, b) => b.fitness - a.fitness);

        history.push(evaluated[0]!.fitness);

        const newPopulation: Chromosome[] = [];

        // elitisim
        for(let i = 0; i < config.elitisimCount; i++) {
            newPopulation.push(evaluated[i]!.chromosome);
        }

        while (newPopulation.length < config.populationSize){
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
    return history;
}