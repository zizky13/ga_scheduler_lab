import { singlePointCrossover } from "./crossovers/singlePoint.js";
import { uniformCrossover } from "./crossovers/uniform.js";
import { partiallyMappedCrossover } from "./crossovers/partiallyMapped.js";
import { runGA } from "./ga/runGA.js";
import { runPreGA } from "./pre-ga/validator.js";
import { checkDiversity } from "./ga/diversity.js";
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

  // --- Diversity check ---
  // Analyses the candidate pool before the GA starts and logs a human-readable
  // report in the same style as the Pre-GA output. The check computes:
  //   • unique slot count       — breadth of the search space
  //   • average pool size       — how many slots each candidate can draw from
  //   • overlap density         — fraction of slot-pairs shared across candidates
  //     (high overlap → many conflicts → harder optimisation problem)
  //   • diversity rating        — LOW / MEDIUM / HIGH based on heuristic thresholds
  // A LOW rating warns that the GA may struggle to reduce hard violations.
  const diversity = checkDiversity(candidates);
  console.log("\n=== Diversity Check ===");
  console.log(`Unique time slots in pool : ${diversity.uniqueSlotCount}`);
  console.log(`Avg possible slots/candidate: ${diversity.avgPoolSize.toFixed(2)}`);
  console.log(`Slot overlap density      : ${(diversity.overlapDensity * 100).toFixed(1)}%`);
  console.log(`Diversity rating          : ${diversity.rating}`);
  if (diversity.rating === "LOW") {
    console.warn("⚠️  Low diversity detected — the GA may converge slowly or to a sub-optimal solution.");
  }

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
