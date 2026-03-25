import type { PreGACandidate } from "../pre-ga/candidate.js";

export interface Gene {
    offeringId : number;
    assignedTimeSlotIds: number[];
}

export type Chromosome = Gene[];

// ---------------------------------------------------------------------------
// Fisher-Yates Shuffle
// ---------------------------------------------------------------------------

/**
 * fisherYatesShuffle
 *
 * Produces a uniformly random permutation of the input array using the
 * Fisher-Yates (Knuth) algorithm.
 *
 * Why not `Array.sort(() => 0.5 - Math.random())`?
 * The comparison-sort approach is biased: JS engines perform a non-uniform
 * number of comparisons depending on the pivot, so some permutations are
 * statistically more likely than others. Fisher-Yates guarantees every
 * permutation is equally probable in O(n) time.
 *
 * Algorithm:
 *   For i from n-1 down to 1:
 *     pick a random index j in [0, i]
 *     swap arr[i] ↔ arr[j]
 *
 * @param arr - The source array (not mutated; a copy is returned).
 * @returns A new array containing the same elements in random order.
 */
function fisherYatesShuffle<T>(arr: T[]): T[] {
    // Work on a shallow copy so the original possibleTimeSlotIds is untouched
    const result = [...arr];

    for (let i = result.length - 1; i > 0; i--) {
        // Pick a uniformly random index in [0, i] (inclusive)
        const j = Math.floor(Math.random() * (i + 1));

        // Swap elements at positions i and j
        const tmp = result[i]!;
        result[i] = result[j]!;
        result[j] = tmp;
    }

    return result;
}

// ---------------------------------------------------------------------------
// Noise injection
// ---------------------------------------------------------------------------

/**
 * addSlotNoise
 *
 * Randomly replaces a fraction of the selected time-slots with other slots
 * drawn from `possibleTimeSlotIds` that are not already in the selection.
 * This "noise" step increases initial-population diversity beyond what the
 * shuffle alone provides, helping the GA explore a wider search space from
 * generation 0.
 *
 * How it works:
 *   For each assigned slot, with probability `noiseRate`:
 *     1. Collect the pool of unused possible slots (those not already assigned).
 *     2. If the pool is non-empty, Fisher-Yates shuffle the pool and pick the
 *        first element as the replacement.
 *     3. If the pool is empty (candidate has exactly `requiredSessions` possible
 *        slots), the slot is left unchanged — no noise can be applied safely.
 *
 * @param slots  - The already-selected time-slot IDs (length = requiredSessions).
 * @param possibleSlots - Full pool of valid slots for this candidate.
 * @param noiseRate - Probability [0, 1] that each individual slot is perturbed.
 *                    Typical value: 0.1–0.25. Set to 0 to disable noise entirely.
 * @returns A new array of time-slot IDs, same length as `slots`, with noise applied.
 */
function addSlotNoise(
    slots: number[],
    possibleSlots: number[],
    noiseRate: number
): number[] {
    // Track which slots are currently "taken" in the selection
    const taken = new Set(slots);
    const result = [...slots];

    for (let i = 0; i < result.length; i++) {
        // Only perturb this slot with probability noiseRate
        if (Math.random() >= noiseRate) continue;

        // Build the pool of possible replacements: slots not already in `taken`
        const pool = possibleSlots.filter(s => !taken.has(s));

        // Edge case: no alternative available — all possible slots are already selected.
        // This happens when possibleSlots.length === requiredSessions. Skip silently.
        if (pool.length === 0) continue;

        // Pick a random replacement from the pool using a single Fisher-Yates pick
        const pickIdx = Math.floor(Math.random() * pool.length);
        const replacement = pool[pickIdx]!;

        // Update the taken set: release the old slot, claim the replacement
        taken.delete(result[i]!);
        taken.add(replacement);

        result[i] = replacement;
    }

    return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * createRandomChromosome
 *
 * Builds a new, randomly initialised chromosome from a list of pre-validated
 * course-offering candidates. Each gene in the chromosome corresponds to one
 * candidate and carries the time-slot assignment for that offering.
 *
 * The initialisation process for each gene is:
 *
 *   1. **Fisher-Yates shuffle** — Produces an unbiased random permutation of
 *      the candidate's possibleTimeSlotIds (O(n), uniform distribution).
 *
 *   2. **Slice** — Takes the first `requiredSessions` IDs from the shuffled
 *      list as the initial time-slot assignment.
 *
 *   3. **Noise** — Randomly perturbs a fraction of the selected slots
 *      (noiseRate = 0.15 by default) by substituting them with other valid
 *      slots from possibleTimeSlotIds. This raises initial-population diversity
 *      without violating feasibility (only valid slots are ever used).
 *
 * Compared to the previous `sort(() => 0.5 - Math.random())` approach, this
 * implementation guarantees a truly uniform distribution over all permutations
 * and introduces controlled diversity via noise, both of which improve the
 * GA's ability to escape local optima early.
 *
 * @param candidates - Feasible course offerings from the Pre-GA phase.
 * @param noiseRate  - Per-slot probability of noise injection (default 0.15).
 * @returns A new Chromosome (Gene[]) ready for fitness evaluation.
 */
export function createRandomChromosome(
    candidates: PreGACandidate[],
    noiseRate: number = 0.15
): Chromosome {
    return candidates.map(candidate => {
        // Step 1: Unbiased Fisher-Yates shuffle of all possible time slots
        const shuffled = fisherYatesShuffle(candidate.possibleTimeSlotIds);

        // Step 2: Select the first `requiredSessions` slots from the shuffled pool
        const selected = shuffled.slice(0, candidate.requiredSessions);

        // Step 3: Apply noise to diversify the selection within valid slot bounds
        const noisy = addSlotNoise(selected, candidate.possibleTimeSlotIds, noiseRate);

        return {
            offeringId: candidate.offeringId,
            assignedTimeSlotIds: noisy,
        };
    });
}