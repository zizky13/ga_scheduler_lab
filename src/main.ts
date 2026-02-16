import { singlePointCrossover } from "./crossovers/singlePoint.js";
import { uniformCrossover } from "./crossovers/uniform.js";
import { runOneGeneration } from "./ga/experiment.js";
import { evaluateFitness } from "./ga/fitness.js";
import { generateInitialPopulation } from "./ga/population.js";
import { runGA } from "./ga/runGA.js";
import { stressTest } from "./ga/stressTest.js";
import { runPreGA } from "./pre-ga/validator.js";

async function main() {
  const output = await runPreGA();
  const candidates = stressTest();

  const config = {
    populationSize: 50,
    generations: 100,
    tournamentSize: 3,
    mutationRate: 0.5,
    elitisimCount: 2
  }

  const singleHistory = runGA(candidates, {
    ...config,
    crossover: singlePointCrossover
  })

  const uniformHistory = runGA(candidates, {
    ...config,
    crossover: uniformCrossover
  })

  console.log("Single Point Crossover History:", singleHistory);
  console.log("Uniform Crossover History:", uniformHistory);
}

main();