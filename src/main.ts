import { singlePointCrossover } from "./crossovers/singlePoint.js";
import { uniformCrossover } from "./crossovers/uniform.js";
import { partiallyMappedCrossover } from "./crossovers/partiallyMapped.js";
import { runGA } from "./ga/runGA.js";
import { runPreGA } from "./pre-ga/validator.js";
import { prisma } from "./db/client.js";
import { generateReport } from "./report/generateReport.js";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    populationSize: 200,
    generations: 70,
    tournamentSize: 3,
    mutationRate: 0.30,
    elitisimCount: 2,
  };

  console.log("\n=== Single Point Crossover ===");
  const singleResult = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: singlePointCrossover,
  });

  console.log("\n=== Uniform Crossover ===");
  const uniformResult = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: uniformCrossover,
  });

  console.log("\n=== PMX Crossover ===");
  const pmxResult = runGA(candidates, lecturerStructuralMap, {
    ...config,
    crossover: partiallyMappedCrossover,
  });

  // Generate HTML report
  const reportPath = path.resolve(__dirname, "../../report.html");
  generateReport(
    [
      { label: "Single Point", result: singleResult },
      { label: "Uniform", result: uniformResult },
      { label: "PMX", result: pmxResult },
    ],
    candidates,
    config,
    reportPath
  );

  // Auto-open in default browser (macOS)
  try {
    execSync(`open "${reportPath}"`);
  } catch {
    console.log(`Open manually: ${reportPath}`);
  }

  await prisma.$disconnect();
}

main();
