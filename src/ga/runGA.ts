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

export function runGA(candidates: PreGACandidate[], lecturerStructuralMap: Map<number, boolean>, config: GAConfig) {
    let population = generateInitialPopulation(candidates, config.populationSize);

    const history: number[] = [];

    for (let gen = 0; gen < config.generations; gen++) {
        // eval fitness
        const evaluated = population.map(ch => {
            const result = evaluateFitness(ch, candidates, lecturerStructuralMap);

            return {
                chromosome: ch,
                fitness: result.fitness,
                hardViolations: result.hardViolations,
                softPenalty: result.softPenalty
            }
        })
        evaluated.sort((a, b) => b.fitness - a.fitness);

        const best = evaluated[0]!;
        const avgFitness = evaluated.reduce((sum, e) => sum + e.fitness, 0) / evaluated.length;
        console.log(
            `Gen ${gen + 1} | best=${best.fitness.toFixed(3)} | avg=${avgFitness.toFixed(3)} | hard=${best.hardViolations} | soft=${best.softPenalty}`
        );
        history.push(best.fitness);

        const newPopulation: Chromosome[] = [];

        // elitisim
        for(let i = 0; i < config.elitisimCount; i++) {
            newPopulation.push(evaluated[i]!.chromosome);
        }

        while (newPopulation.length < config.populationSize){
            const parent1 = tournamentSelection(population, candidates, config.tournamentSize);

            const parent2 = tournamentSelection(population, candidates, config.tournamentSize);

            const [child1, child2] = config.crossover(parent1, parent2);

            console.log("child1", child1);
            console.log("child2", child2);
            const mutated1 = mutateChromosome(child1, candidates, config.mutationRate);
            const mutated2 = mutateChromosome(child2, candidates, config.mutationRate);
            console.log("mutated1", mutated1);
            console.log("mutated2", mutated2);


            newPopulation.push(mutated1, mutated2);

            if (newPopulation.length < config.populationSize) {
                newPopulation.push(mutated2);
            }
        }

        console.log(evaluated.map(e => e.hardViolations));
        population = newPopulation;
    }
    
    return history;
}