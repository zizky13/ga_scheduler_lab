import type { Chromosome } from "./chromosome.js";

export type CrossoverOperator = (parent1: Chromosome, parent2: Chromosome) => [Chromosome, Chromosome];