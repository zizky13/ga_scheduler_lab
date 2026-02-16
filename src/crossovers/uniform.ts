import type { Chromosome } from "../ga/chromosome.js";

export function uniformCrossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
    if (parent1.length !== parent2.length) {
        throw new Error("Parents must have the same length for crossover.");
    }

    const length = parent1.length;
    const child1: Chromosome = [];
    const child2: Chromosome = [];

    for (let i = 0; i < length; i++) {
        if (Math.random() < 0.5) {
            child1.push(parent1[i]!);
            child2.push(parent2[i]!);
        } else {
            child1.push(parent2[i]!);
            child2.push(parent1[i]!);
        }
    }

    return [child1, child2];
}