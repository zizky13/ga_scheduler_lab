import { singlePointCrossover } from "./crossovers/singlePoint.js";
import { uniformCrossover } from "./crossovers/uniform.js";
import { partiallyMappedCrossover } from "./crossovers/partiallyMapped.js";
import { runGA } from "./ga/runGA.js";
import { runPreGA } from "./pre-ga/validator.js";
import { prisma } from "./db/client.js";

async function main() {
  // Run pre-GA checks and get feasible candidates from the database
  const output = await runPreGA();
  const candidates = output.feasible;

  console.log(`Pre-GA complete: ${candidates.length} feasible, ${output.infeasible.length} infeasible offerings.`);

  if (candidates.length === 0) {
    console.log("No feasible candidates found. Aborting GA.");
    await prisma.$disconnect();
    return;
  }

  // Build lecturer structural map from the real DB data
  const allLecturers = await prisma.lecturer.findMany();
  const lecturerStructuralMap = new Map<number, boolean>(
    allLecturers.map(l => [l.id, l.isStructural])
  );

  const config = {
    populationSize: 50,
    generations: 70,
    tournamentSize: 3,
    mutationRate: 0.35,
    elitisimCount: 2,
  };

  const singleHistory = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: singlePointCrossover,
  });

  const uniformHistory = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: uniformCrossover,
  });

  const pmxHistory = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: partiallyMappedCrossover,
  });

  console.log("Single Point Crossover History:", singleHistory);
  console.log("Uniform Crossover History:", uniformHistory);
  console.log("PMX Crossover History:", pmxHistory);

  await prisma.$disconnect();
}

main();