/**
 * chromosomeSampleTest.ts
 *
 * Diagnostic script: generates 2000 random chromosomes from the real DB candidates
 * and reports the minimum (best), maximum (worst), mean, and distribution of
 * hard constraint violations across all samples.
 *
 * Run with:
 *   npx tsx src/scripts/chromosomeSampleTest.ts
 *
 * Purpose:
 *   This gives a baseline picture of the initial-population quality BEFORE any
 *   GA evolution or repair runs. Comparing these numbers against early-generation
 *   GA output tells you how much the repair + evolution pipeline is actually
 *   contributing.
 */

import { runPreGA } from "../pre-ga/validator.js";
import { prisma } from "../db/client.js";
import { createRandomChromosome } from "../ga/chromosome.js";
import { evaluateHardFitness } from "../ga/fitness.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Number of random chromosomes to sample. */
const SAMPLE_SIZE = 2000;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    // -----------------------------------------------------------------------
    // 1. Fetch feasible candidates from the database (same as main GA run)
    // -----------------------------------------------------------------------
    console.log("Fetching candidates from database via Pre-GA pipeline...");
    const output = await runPreGA();
    const candidates = output.feasible;

    console.log(
        `Pre-GA: ${candidates.length} feasible, ${output.infeasible.length} infeasible offerings.\n`
    );

    if (candidates.length === 0) {
        console.error("No feasible candidates — cannot generate chromosomes. Aborting.");
        await prisma.$disconnect();
        return;
    }

    // -----------------------------------------------------------------------
    // 2. Generate SAMPLE_SIZE random chromosomes and evaluate each one
    // -----------------------------------------------------------------------
    console.log(`Generating ${SAMPLE_SIZE} random chromosomes...`);

    const violations: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i++) {
        // createRandomChromosome uses Fisher-Yates shuffle + noise (noiseRate=0.15)
        const chromosome = createRandomChromosome(candidates);

        // evaluateHardFitness counts room-time and lecturer-time collisions
        const { hardViolations } = evaluateHardFitness(chromosome, candidates);
        violations.push(hardViolations);
    }

    // -----------------------------------------------------------------------
    // 3. Compute statistics from the sample
    // -----------------------------------------------------------------------

    // Minimum hard violations in the sample (best random chromosome)
    const minViolations = Math.min(...violations);

    // Maximum hard violations (worst random chromosome)
    const maxViolations = Math.max(...violations);

    // Mean hard violations (average quality of a random chromosome)
    const meanViolations = violations.reduce((a, b) => a + b, 0) / violations.length;

    // Median hard violations (central tendency, robust to outliers)
    const sorted = [...violations].sort((a, b) => a - b);
    const midIdx = Math.floor(sorted.length / 2);
    const medianViolations =
        sorted.length % 2 === 1
            ? sorted[midIdx]!
            : (sorted[midIdx - 1]! + sorted[midIdx]!) / 2;

    // Count how many chromosomes are already conflict-free (hard violations = 0)
    const zeroViolationCount = violations.filter(v => v === 0).length;

    // Build a simple bucket histogram: 0, 1–5, 6–10, 11–20, 21–50, 51+
    // Using an explicit typed object (not a generic Record) so TypeScript
    // knows every key is always present and the ++ operations are safe.
    const buckets = {
        "0       ": 0,
        "1 – 5   ": 0,
        "6 – 10  ": 0,
        "11 – 20 ": 0,
        "21 – 50 ": 0,
        "51+     ": 0,
    };
    for (const v of violations) {
        if (v === 0)      buckets["0       "]++;
        else if (v <= 5)  buckets["1 – 5   "]++;
        else if (v <= 10) buckets["6 – 10  "]++;
        else if (v <= 20) buckets["11 – 20 "]++;
        else if (v <= 50) buckets["21 – 50 "]++;
        else              buckets["51+     "]++;
    }

    // -----------------------------------------------------------------------
    // 4. Print the report
    // -----------------------------------------------------------------------
    console.log("\n╔══════════════════════════════════════════════╗");
    console.log("║     Random Chromosome Sample Report          ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log(`  Sample size      : ${SAMPLE_SIZE.toLocaleString()} chromosomes`);
    console.log(`  Candidates       : ${candidates.length}`);
    console.log("");
    console.log("  ── Hard Violations ───────────────────────────");
    console.log(`  Minimum (best)   : ${minViolations}`);
    console.log(`  Maximum (worst)  : ${maxViolations}`);
    console.log(`  Mean             : ${meanViolations.toFixed(2)}`);
    console.log(`  Median           : ${medianViolations}`);
    console.log(`  Zero-violation   : ${zeroViolationCount} / ${SAMPLE_SIZE} (${((zeroViolationCount / SAMPLE_SIZE) * 100).toFixed(2)}%)`);
    console.log("");
    console.log("  ── Distribution ──────────────────────────────");
    for (const [bucket, count] of Object.entries(buckets)) {
        const pct = ((count / SAMPLE_SIZE) * 100).toFixed(1).padStart(5);
        const bar = "█".repeat(Math.round(count / SAMPLE_SIZE * 40));
        console.log(`  ${bucket} : ${String(count).padStart(5)} (${pct}%) ${bar}`);
    }
    console.log("══════════════════════════════════════════════════");

    // -----------------------------------------------------------------------
    // 5. Interpretation hint
    // -----------------------------------------------------------------------
    if (minViolations === 0) {
        console.log("\n✅ At least one conflict-free chromosome was found by pure random sampling.");
        console.log("   The search space is wide enough that the GA should converge quickly.");
    } else if (minViolations <= 3) {
        console.log(`\n🟡 Minimum violations = ${minViolations} — very close to feasible.`);
        console.log("   The repair + GA pipeline should reliably reach hard=0.");
    } else {
        console.log(`\n🔴 Minimum violations = ${minViolations} — no randomly sampled chromosome is close to feasible.`);
        console.log("   Consider: more time slots, lower candidate count, or higher noiseRate.");
    }

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
