import type { Chromosome } from "../ga/chromosome.js";

export function singlePointCrossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    if (parent1.length !== parent2.length) {
        throw new Error("Parents must have the same length for crossover.");
    }

    const length = parent1.length;
    const crossoverPoint = Math.floor(Math.random() * (length - 1)) + 1;

    const child1 = [...parent1.slice(0, crossoverPoint), ...parent2.slice(crossoverPoint)];
    const child2 = [...parent2.slice(0, crossoverPoint), ...parent1.slice(crossoverPoint)];

    return [child1, child2];
}