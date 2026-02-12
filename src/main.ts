import { evaluateFitness } from "./ga/fitness.js";
import { generateInitialPopulation } from "./ga/population.js";
import { runPreGA } from "./pre-ga/validator.js";

async function main() {
  const output = await runPreGA();
  const population = generateInitialPopulation(output.feasible, 10);

  for (const chromosome of population) {
    const fitness = evaluateFitness(chromosome, output.feasible);
    console.log(`Fitness: ${fitness.fitness}, Hard Violations: ${fitness.hardViolations}`);
  }
  
}

main();