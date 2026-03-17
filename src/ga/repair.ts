import type { Chromosome, Gene } from "./chromosome.js";
import type { PreGACandidate } from "../pre-ga/candidate.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Tracks how many genes currently occupy a given (room|lecturer) × time-slot
 * key. Keys are composite strings in the form "roomId-timeSlotId" or
 * "lecturerId-timeSlotId".
 */
type UsageMap = Map<string, Set<number>>;

// ---------------------------------------------------------------------------
// Step 1: Build conflict index
// ---------------------------------------------------------------------------

/**
 * buildConflictIndex
 *
 * Makes a single O(n*s) pass over the chromosome (n genes, s sessions each)
 * and returns two usage maps that track which gene indices occupy each
 * (resource, time-slot) pair:
 *
 *  - roomTimeUsage  : "roomId-timeSlotId"      → Set of gene indices
 *  - lecturerTimeUsage: "lecturerId-timeSlotId" → Set of gene indices
 *
 * A set size > 1 means a conflict exists for that key.
 */
function buildConflictIndex(
    chromosome: Chromosome,
    candidates: PreGACandidate[]
): { roomTimeUsage: UsageMap; lecturerTimeUsage: UsageMap } {
    // Fast O(1) lookup from offeringId to candidate metadata
    const candidateMap = new Map(candidates.map(c => [c.offeringId, c]));

    const roomTimeUsage: UsageMap = new Map();
    const lecturerTimeUsage: UsageMap = new Map();

    for (let geneIdx = 0; geneIdx < chromosome.length; geneIdx++) {
        const gene = chromosome[geneIdx]!;
        const candidate = candidateMap.get(gene.offeringId);

        // Skip genes with no matching candidate (should not happen in normal operation)
        if (!candidate) continue;

        for (const timeSlotId of gene.assignedTimeSlotIds) {
            // Room conflict index: one room can host at most one class per slot
            const roomKey = `${candidate.roomId}-${timeSlotId}`;
            if (!roomTimeUsage.has(roomKey)) roomTimeUsage.set(roomKey, new Set());
            roomTimeUsage.get(roomKey)!.add(geneIdx);

            // Lecturer conflict index: one lecturer can teach at most one class per slot
            for (const lecturerId of candidate.lecturerIds) {
                const lecturerKey = `${lecturerId}-${timeSlotId}`;
                if (!lecturerTimeUsage.has(lecturerKey)) lecturerTimeUsage.set(lecturerKey, new Set());
                lecturerTimeUsage.get(lecturerKey)!.add(geneIdx);
            }
        }
    }

    return { roomTimeUsage, lecturerTimeUsage };
}

// ---------------------------------------------------------------------------
// Step 2: Score each gene's conflict severity
// ---------------------------------------------------------------------------

/**
 * scoreGeneConflicts
 *
 * For a single gene (identified by its index), counts the total number of
 * collisions it is part of, considering both room-time and lecturer-time maps.
 *
 * A collision occurs whenever a usage-map key has more than one gene in its
 * set. For each such key the contribution to the conflict score is
 * (setSize - 1) — i.e., the number of *other* genes sharing the same slot.
 * This keeps the score meaningful even when many genes fight over one slot.
 */
function scoreGeneConflicts(
    geneIdx: number,
    gene: Gene,
    candidate: PreGACandidate,
    roomTimeUsage: UsageMap,
    lecturerTimeUsage: UsageMap
): number {
    let score = 0;

    for (const timeSlotId of gene.assignedTimeSlotIds) {
        // Room conflict contribution
        const roomKey = `${candidate.roomId}-${timeSlotId}`;
        const roomSet = roomTimeUsage.get(roomKey);
        if (roomSet && roomSet.size > 1) {
            score += roomSet.size - 1;
        }

        // Lecturer conflict contribution (one per lecturer per slot)
        for (const lecturerId of candidate.lecturerIds) {
            const lecturerKey = `${lecturerId}-${timeSlotId}`;
            const lecturerSet = lecturerTimeUsage.get(lecturerKey);
            if (lecturerSet && lecturerSet.size > 1) {
                score += lecturerSet.size - 1;
            }
        }
    }

    return score;
}

// ---------------------------------------------------------------------------
// Step 3: Helper — count conflicts a candidate slot would have
// ---------------------------------------------------------------------------

/**
 * countSlotConflicts
 *
 * Evaluates how many conflicts would remain if a given slot were assigned
 * to the gene at `geneIdx`. Does NOT mutate any state — purely a scoring
 * function used during best-slot search.
 *
 * The gene's current slot assignments are passed in so we can exclude them
 * from the usage maps when counting (we're hypothetically replacing one slot,
 * not adding a new one).
 */
function countSlotConflicts(
    slotId: number,
    geneIdx: number,
    candidate: PreGACandidate,
    roomTimeUsage: UsageMap,
    lecturerTimeUsage: UsageMap
): number {
    let count = 0;

    // Room check: how many OTHER genes already use this room×slot?
    const roomKey = `${candidate.roomId}-${slotId}`;
    const roomSet = roomTimeUsage.get(roomKey);
    if (roomSet) {
        // Subtract 1 if this gene itself is already registered (re-assignment)
        const others = roomSet.has(geneIdx) ? roomSet.size - 1 : roomSet.size;
        count += others;
    }

    // Lecturer check: same logic for every lecturer of this candidate
    for (const lecturerId of candidate.lecturerIds) {
        const lecturerKey = `${lecturerId}-${slotId}`;
        const lecturerSet = lecturerTimeUsage.get(lecturerKey);
        if (lecturerSet) {
            const others = lecturerSet.has(geneIdx) ? lecturerSet.size - 1 : lecturerSet.size;
            count += others;
        }
    }

    return count;
}

// ---------------------------------------------------------------------------
// Step 4: Helper — update usage maps after reassigning a slot
// ---------------------------------------------------------------------------

/**
 * removeSlotFromIndex
 *
 * Removes `geneIdx` from the usage-map sets for a specific slot.
 * Called right before a slot is replaced so the index reflects the state
 * *without* the old assignment.
 */
function removeSlotFromIndex(
    oldSlotId: number,
    geneIdx: number,
    candidate: PreGACandidate,
    roomTimeUsage: UsageMap,
    lecturerTimeUsage: UsageMap
): void {
    const roomKey = `${candidate.roomId}-${oldSlotId}`;
    roomTimeUsage.get(roomKey)?.delete(geneIdx);

    for (const lecturerId of candidate.lecturerIds) {
        const lecturerKey = `${lecturerId}-${oldSlotId}`;
        lecturerTimeUsage.get(lecturerKey)?.delete(geneIdx);
    }
}

/**
 * addSlotToIndex
 *
 * Registers `geneIdx` in the usage-map sets for the newly assigned slot.
 * Called immediately after a slot replacement so subsequent iterations see an
 * up-to-date conflict index.
 */
function addSlotToIndex(
    newSlotId: number,
    geneIdx: number,
    candidate: PreGACandidate,
    roomTimeUsage: UsageMap,
    lecturerTimeUsage: UsageMap
): void {
    const roomKey = `${candidate.roomId}-${newSlotId}`;
    if (!roomTimeUsage.has(roomKey)) roomTimeUsage.set(roomKey, new Set());
    roomTimeUsage.get(roomKey)!.add(geneIdx);

    for (const lecturerId of candidate.lecturerIds) {
        const lecturerKey = `${lecturerId}-${newSlotId}`;
        if (!lecturerTimeUsage.has(lecturerKey)) lecturerTimeUsage.set(lecturerKey, new Set());
        lecturerTimeUsage.get(lecturerKey)!.add(geneIdx);
    }
}

// ---------------------------------------------------------------------------
// Step 5: Find the best replacement slot for one conflicting slot
// ---------------------------------------------------------------------------

/**
 * findBestSlot
 *
 * Given that `conflictingSlotId` is currently causing a hard violation for
 * `gene` at index `geneIdx`, searches the candidate's `possibleTimeSlotIds`
 * for the slot that would produce the fewest remaining conflicts if assigned
 * instead.
 *
 * Returns the slot with the minimum conflict score. If no alternative exists
 * (only one possible slot and it is already the conflicting one), the original
 * slot is returned unchanged — this is the edge-case "keep least-bad" path.
 *
 * The returned slot is guaranteed NOT to be currently in
 * `alreadyAssignedSlots` (the other sessions this gene already occupies), to
 * prevent a gene from being assigned the same slot twice.
 */
function findBestSlot(
    conflictingSlotId: number,
    geneIdx: number,
    gene: Gene,
    candidate: PreGACandidate,
    roomTimeUsage: UsageMap,
    lecturerTimeUsage: UsageMap
): number {
    // The set of slots this gene is currently using (excluding the one we're replacing)
    const currentSlots = new Set(gene.assignedTimeSlotIds.filter(s => s !== conflictingSlotId));

    let bestSlot = conflictingSlotId; // default: keep original (edge case)
    let bestScore = Infinity;

    for (const candidateSlot of candidate.possibleTimeSlotIds) {
        // Skip if this gene already uses this slot in another session (no duplicates)
        if (currentSlots.has(candidateSlot)) continue;

        const conflictScore = countSlotConflicts(
            candidateSlot,
            geneIdx,
            candidate,
            roomTimeUsage,
            lecturerTimeUsage
        );

        if (conflictScore < bestScore) {
            bestScore = conflictScore;
            bestSlot = candidateSlot;

            // Short-circuit: a perfectly conflict-free slot found; no need to look further
            if (bestScore === 0) break;
        }
    }

    return bestSlot;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * repairChromosome
 *
 * Applies conflict-aware repair to a chromosome produced by crossover or
 * mutation. The algorithm works in five stages:
 *
 * 0. Pre-stage — De-duplicate slots within a gene.
 *    Crossover can produce genes where the same time-slot appears more than
 *    once (e.g. [1, 1]). These intra-gene duplicates are invisible to the
 *    usage-map conflict index (which uses Set<geneIndex> per key) and must be
 *    resolved before the index is built. Each duplicate is replaced with the
 *    first unused slot from possibleTimeSlotIds.
 *
 * 1. Build a conflict index (roomTimeUsage + lecturerTimeUsage).
 * 2. Score every gene by its total conflict severity.
 * 3. Sort genes from worst conflicts to best (process most-violated first).
 * 4. For each conflicted gene, identify which assigned time-slots are causing
 *    violations and replace them with the best available alternative from
 *    `possibleTimeSlotIds`, updating the conflict index after each swap.
 *
 * Edge cases handled:
 * - Intra-gene duplicate slots: replaced by the first unused possible slot.
 * - Gene with no candidate metadata: skipped without error.
 * - No alternative conflict-free slot exists: the slot with the fewest
 *   remaining conflicts is chosen (least-bad strategy), preventing infinite
 *   loops and ensuring the chromosome is always returned in a valid state.
 * - Gene already conflict-free: left untouched.
 * - Gene assigned fewer time slots than `requiredSessions` (corrupted gene):
 *   not re-introduced here; fitness will naturally penalise it.
 *
 * Returns a new chromosome array (the original is not mutated).
 */
export function repairChromosome(
    chromosome: Chromosome,
    candidates: PreGACandidate[]
): Chromosome {
    // Fast lookup from offeringId → candidate metadata
    const candidateMap = new Map(candidates.map(c => [c.offeringId, c]));

    // Work on a deep copy so we never mutate the caller's data
    const repaired: Chromosome = chromosome.map(gene => ({
        ...gene,
        assignedTimeSlotIds: [...gene.assignedTimeSlotIds],
    }));

    // --- Pre-stage: Normalize duplicate slots within a single gene ---
    //
    // A gene can end up with the same slot assigned twice (e.g. [1, 1]) when
    // crossover combines two parents that both chose the same slot.  The
    // conflict index uses a Set<geneIndex> per key, so intra-gene duplicates
    // are invisible to the regular conflict scorer.  We fix this first so the
    // index is built on clean data.
    for (let geneIdx = 0; geneIdx < repaired.length; geneIdx++) {
        const gene = repaired[geneIdx]!;
        const candidate = candidateMap.get(gene.offeringId);
        if (!candidate) continue;

        const seenSlots = new Set<number>();
        const deduped: number[] = [];

        for (const slotId of gene.assignedTimeSlotIds) {
            if (!seenSlots.has(slotId)) {
                // First occurrence — keep it
                seenSlots.add(slotId);
                deduped.push(slotId);
            } else {
                // Duplicate slot within this gene: find the best unused alternative
                // from possibleTimeSlotIds that is not already in seenSlots.
                let replacement: number | null = null;
                for (const alt of candidate.possibleTimeSlotIds) {
                    if (!seenSlots.has(alt)) {
                        replacement = alt;
                        break; // take the first available; full scoring happens later
                    }
                }

                if (replacement !== null) {
                    // Use the alternative — it is guaranteed to be unique in this gene
                    seenSlots.add(replacement);
                    deduped.push(replacement);
                }
                // If no alternative exists (all possible slots already used by this gene),
                // silently drop the duplicate — the gene ends up shorter than requiredSessions,
                // which the fitness function will penalise naturally.
            }
        }

        repaired[geneIdx] = { ...gene, assignedTimeSlotIds: deduped };
    }

    // --- Stage 1: Build conflict index ---
    const { roomTimeUsage, lecturerTimeUsage } = buildConflictIndex(repaired, candidates);

    // --- Stage 2: Score every gene ---
    const geneScores: { geneIdx: number; score: number }[] = [];

    for (let geneIdx = 0; geneIdx < repaired.length; geneIdx++) {
        const gene = repaired[geneIdx]!;
        const candidate = candidateMap.get(gene.offeringId);
        if (!candidate) continue;

        const score = scoreGeneConflicts(
            geneIdx,
            gene,
            candidate,
            roomTimeUsage,
            lecturerTimeUsage
        );

        if (score > 0) {
            // Only track genes that actually have conflicts
            geneScores.push({ geneIdx, score });
        }
    }

    // --- Stage 3: Sort worst conflicts first (descending score) ---
    geneScores.sort((a, b) => b.score - a.score);

    // --- Stage 4: Repair loop ---
    for (const { geneIdx } of geneScores) {
        const gene = repaired[geneIdx]!;
        const candidate = candidateMap.get(gene.offeringId);

        // Edge case: candidate metadata missing — cannot repair, skip
        if (!candidate) continue;

        // Re-score this gene with the CURRENT conflict index (it may have changed
        // due to earlier repairs in this same chromosome)
        const currentScore = scoreGeneConflicts(
            geneIdx,
            gene,
            candidate,
            roomTimeUsage,
            lecturerTimeUsage
        );

        // Gene may have been incidentally fixed by a prior repair — skip if clean
        if (currentScore === 0) continue;

        // Identify which of this gene's assigned slots are currently conflicting
        const newAssignment: number[] = [];

        for (const slotId of gene.assignedTimeSlotIds) {
            // Check if this specific slot causes any conflict for this gene
            const roomKey = `${candidate.roomId}-${slotId}`;
            const roomConflict =
                (roomTimeUsage.get(roomKey)?.size ?? 0) > 1;

            const lecturerConflict = candidate.lecturerIds.some(lecturerId => {
                const lecturerKey = `${lecturerId}-${slotId}`;
                return (lecturerTimeUsage.get(lecturerKey)?.size ?? 0) > 1;
            });

            if (roomConflict || lecturerConflict) {
                // This slot is causing a violation — find the best replacement
                const bestSlot = findBestSlot(
                    slotId,
                    geneIdx,
                    { ...gene, assignedTimeSlotIds: newAssignment.concat(
                        gene.assignedTimeSlotIds.slice(newAssignment.length)
                    )},
                    candidate,
                    roomTimeUsage,
                    lecturerTimeUsage
                );

                // Update the conflict index: remove old slot, add new slot
                removeSlotFromIndex(slotId, geneIdx, candidate, roomTimeUsage, lecturerTimeUsage);
                addSlotToIndex(bestSlot, geneIdx, candidate, roomTimeUsage, lecturerTimeUsage);

                newAssignment.push(bestSlot);
            } else {
                // Slot is clean — keep it as-is
                newAssignment.push(slotId);
            }
        }

        // Write the repaired assignment back into the working chromosome copy
        repaired[geneIdx] = { ...gene, assignedTimeSlotIds: newAssignment };
    }

    return repaired;
}
