import type { PreGACandidate } from "../pre-ga/candidate.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * DiversityRating
 *
 * A three-level qualitative rating of the candidate pool's time-slot diversity.
 *
 * | Rating | Meaning |
 * |--------|---------|
 * | HIGH   | Wide slot pools, low overlap — GA has ample search space |
 * | MEDIUM | Moderate pools or overlap — GA will work but may need more generations |
 * | LOW    | Narrow pools or very high overlap — high risk of slow convergence / stuck at hard violations |
 */
export type DiversityRating = "HIGH" | "MEDIUM" | "LOW";

/**
 * DiversityReport
 *
 * The structured output of `checkDiversity()`. All numeric fields are computed
 * analytically from the candidate pool — no random sampling is involved.
 */
export interface DiversityReport {
    /**
     * Total number of distinct time-slot IDs that appear across all candidates'
     * `possibleTimeSlotIds` pools. A larger number indicates a wider search space.
     */
    uniqueSlotCount: number;

    /**
     * Mean number of possible time slots per candidate.
     *
     * Formula: sum(possibleTimeSlotIds.length) / candidates.length
     *
     * A higher average means each candidate has more choices, reducing conflict
     * pressure. A low average (≈ requiredSessions) means there's little
     * freedom for the repair algorithm or mutation to find better assignments.
     */
    avgPoolSize: number;

    /**
     * Fraction of (candidate × time-slot) pairs that are shared with at least
     * one other candidate in the same room. Values closer to 1.0 mean most
     * candidates compete for the same slots, making conflicts harder to avoid.
     *
     * Formula:
     *   For each room, build the set of slots used by candidates in that room.
     *   Overlap = slots that appear in more than one candidate in the same room.
     *   overlapDensity = |overlapping slots| / |total slots across all rooms|
     *
     * Range: [0, 1]. 0 = no shared slots at all; 1 = every slot is shared.
     */
    overlapDensity: number;

    /**
     * Qualitative diversity rating derived from `avgPoolSize` and `overlapDensity`.
     *
     * Thresholds (heuristic, tunable):
     *   HIGH   : avgPoolSize ≥ 3 × requiredSessions AND overlapDensity < 0.5
     *   MEDIUM : avgPoolSize ≥ 1.5 × requiredSessions OR overlapDensity < 0.7
     *   LOW    : anything else
     *
     * A LOW rating should trigger a warning in main.ts, as the GA is
     * unlikely to eliminate all hard violations without manual intervention
     * (e.g. adding more time slots to the timetable).
     */
    rating: DiversityRating;

    /**
     * Average number of required sessions across all candidates.
     * Included for context when interpreting `avgPoolSize`.
     */
    avgRequiredSessions: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * checkDiversity
 *
 * Analyses a list of Pre-GA candidates and returns a `DiversityReport`
 * describing how varied the time-slot assignment space is before the GA runs.
 *
 * The function is intentionally **pure and side-effect-free** — it only reads
 * from `candidates` and returns a plain data object. Logging is left to the
 * caller (`main.ts`) so this module stays testable in isolation.
 *
 * Edge cases:
 *   - Empty candidates array → returns zeroed report with rating "LOW".
 *   - Candidate with empty `possibleTimeSlotIds` → contributes 0 to averages;
 *     does not throw.
 *
 * Complexity: O(C × S) where C = number of candidates, S = average pool size.
 *
 * @param candidates - Feasible candidates from the Pre-GA phase.
 * @returns A `DiversityReport` with all computed diversity metrics.
 */
export function checkDiversity(candidates: PreGACandidate[]): DiversityReport {
    // Edge case: no candidates → return a zeroed, LOW-rated report
    if (candidates.length === 0) {
        return {
            uniqueSlotCount: 0,
            avgPoolSize: 0,
            overlapDensity: 0,
            rating: "LOW",
            avgRequiredSessions: 0,
        };
    }

    // --- Metric 1: Unique slot count (global search-space breadth) ---
    // Collect every slot ID mentioned by any candidate into a single Set.
    const allSlots = new Set<number>();
    for (const c of candidates) {
        for (const slotId of c.possibleTimeSlotIds) {
            allSlots.add(slotId);
        }
    }
    const uniqueSlotCount = allSlots.size;

    // --- Metric 2: Average pool size per candidate ---
    const totalPoolSize = candidates.reduce((sum, c) => sum + c.possibleTimeSlotIds.length, 0);
    const avgPoolSize = totalPoolSize / candidates.length;

    // --- Metric 3: Average required sessions per candidate ---
    const totalRequired = candidates.reduce((sum, c) => sum + c.requiredSessions, 0);
    const avgRequiredSessions = totalRequired / candidates.length;

    // --- Metric 4: Slot overlap density (within-room competition) ---
    //
    // Group candidates by room. Within each room, any slot that appears in
    // more than one candidate's pool is a "shared" slot — meaning two classes
    // must "fight" over who gets that slot.
    //
    // overlapDensity = (# candidate×slot pairs that are shared) / (total candidate×slot pairs)
    //
    // This gives an intuitive [0,1] measure: 0 = no competition at all,
    // 1 = every slot of every candidate is shared with at least one rival.

    // Map: roomId → Map<slotId, count of candidates that include this slot>
    const roomSlotCounts = new Map<number, Map<number, number>>();

    for (const c of candidates) {
        if (!roomSlotCounts.has(c.roomId)) {
            roomSlotCounts.set(c.roomId, new Map());
        }
        const slotCounts = roomSlotCounts.get(c.roomId)!;

        for (const slotId of c.possibleTimeSlotIds) {
            slotCounts.set(slotId, (slotCounts.get(slotId) ?? 0) + 1);
        }
    }

    let sharedPairs = 0;   // candidate×slot pairs where count > 1 (the slot is contested)
    let totalPairs  = 0;   // total candidate×slot pairs across all rooms

    for (const c of candidates) {
        const slotCounts = roomSlotCounts.get(c.roomId)!;
        for (const slotId of c.possibleTimeSlotIds) {
            totalPairs++;
            // A slot is "shared" if more than one candidate in the same room can use it
            if ((slotCounts.get(slotId) ?? 0) > 1) {
                sharedPairs++;
            }
        }
    }

    // Avoid division by zero when all pool sizes are 0
    const overlapDensity = totalPairs > 0 ? sharedPairs / totalPairs : 0;

    // --- Metric 5: Derive qualitative rating ---
    //
    // Heuristic thresholds (empirically derived, can be tuned):
    //   HIGH   : avg pool ≥ 3× required sessions AND overlap < 50%
    //   MEDIUM : avg pool ≥ 1.5× required sessions OR overlap < 70%
    //   LOW    : everything else (tight pools and heavy overlap)
    let rating: DiversityRating;

    const poolRatio = avgRequiredSessions > 0
        ? avgPoolSize / avgRequiredSessions
        : 0;

    if (poolRatio >= 3.0 && overlapDensity < 0.5) {
        rating = "HIGH";
    } else if (poolRatio >= 1.5 || overlapDensity < 0.7) {
        rating = "MEDIUM";
    } else {
        rating = "LOW";
    }

    return {
        uniqueSlotCount,
        avgPoolSize,
        overlapDensity,
        rating,
        avgRequiredSessions,
    };
}
