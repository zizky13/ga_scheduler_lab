import { describe, it, expect } from "vitest";
import { repairChromosome } from "../../ga/repair.js";
import { evaluateHardFitness } from "../../ga/fitness.js";
import type { Chromosome } from "../../ga/chromosome.js";
import type { PreGACandidate } from "../../pre-ga/candidate.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal candidate factory for tests.
 * Each candidate gets a unique offeringId, a single room, one lecturer, and a
 * configurable set of possibleTimeSlotIds.
 */
function makeCandidate(
    offeringId: number,
    roomId: number,
    lecturerId: number,
    possibleTimeSlotIds: number[],
    requiredSessions = 1
): PreGACandidate {
    return {
        offeringId,
        roomId,
        lecturerIds: [lecturerId],
        possibleTimeSlotIds,
        requiredSessions,
    };
}

// ---------------------------------------------------------------------------
// Suite 1: Room-time conflicts
// ---------------------------------------------------------------------------

describe("repairChromosome — room-time conflict", () => {
    it("resolves a simple two-gene room-time collision to 0 hard violations", () => {
        /**
         * Setup: two offerings share the same room (roomId=1) and are both
         * assigned to slot 1. Slot 2 is available as an alternative for the
         * second gene.
         *
         * Before repair: hard violations = 1 (room 1 double-booked at slot 1)
         * After repair:  hard violations = 0 (second gene moved to slot 2)
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2]),
            makeCandidate(2, 1, 11, [1, 2]),
        ];

        // Both genes deliberately assigned to the same room×slot → conflict
        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 2, assignedTimeSlotIds: [1] },
        ];

        const repaired = repairChromosome(chromosome, candidates);
        const { hardViolations } = evaluateHardFitness(repaired, candidates);

        expect(hardViolations).toBe(0);
    });

    it("handles three genes all in the same room×slot", () => {
        /**
         * Three offerings share room 1 and are all assigned slot 1.
         * Slots 2, 3, 4 are alternatives.
         * After repair: all three should spread across different slots.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2, 3, 4]),
            makeCandidate(2, 1, 11, [1, 2, 3, 4]),
            makeCandidate(3, 1, 12, [1, 2, 3, 4]),
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 2, assignedTimeSlotIds: [1] },
            { offeringId: 3, assignedTimeSlotIds: [1] },
        ];

        const repaired = repairChromosome(chromosome, candidates);
        const { hardViolations } = evaluateHardFitness(repaired, candidates);

        expect(hardViolations).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Suite 2: Lecturer-time conflicts
// ---------------------------------------------------------------------------

describe("repairChromosome — lecturer-time conflict", () => {
    it("resolves a lecturer teaching two courses at the same slot", () => {
        /**
         * Two offerings with DIFFERENT rooms but the SAME lecturer (id=10) both
         * assigned to slot 1. Slot 2 is available for gene 2.
         *
         * Before repair: 1 lecturer conflict
         * After repair:  0 violations
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2]), // room 1, lecturer 10
            makeCandidate(2, 2, 10, [1, 2]), // room 2, lecturer 10 (different room but same lecturer)
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 2, assignedTimeSlotIds: [1] },
        ];

        const repaired = repairChromosome(chromosome, candidates);
        const { hardViolations } = evaluateHardFitness(repaired, candidates);

        expect(hardViolations).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Suite 3: Multi-session genes (requiredSessions > 1)
// ---------------------------------------------------------------------------

describe("repairChromosome — multi-session genes", () => {
    it("repairs a 2-session gene that partially conflicts", () => {
        /**
         * Gene 1 needs 2 sessions, gets [1, 3].
         * Gene 2 needs 1 session, gets [1] — conflicts with gene 1's slot 1 in room 1.
         * Slots 2 and 4 are available alternatives.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2, 3, 4], 2),
            makeCandidate(2, 1, 11, [1, 2, 3, 4], 1),
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1, 3] },
            { offeringId: 2, assignedTimeSlotIds: [1] },
        ];

        const repaired = repairChromosome(chromosome, candidates);
        const { hardViolations } = evaluateHardFitness(repaired, candidates);

        expect(hardViolations).toBe(0);
    });

    it("does not assign the same slot twice within one multi-session gene", () => {
        /**
         * Only slots 1 and 2 exist. Gene needs 2 sessions and starts at [1, 1].
         * After repair the two assigned slots must be distinct.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2], 2),
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1, 1] }, // duplicate on purpose
        ];

        const repaired = repairChromosome(chromosome, candidates);

        // The two sessions must occupy different slots
        const slots = repaired[0]!.assignedTimeSlotIds;
        expect(slots.length).toBe(2);
        expect(new Set(slots).size).toBe(2); // both slots are distinct
    });
});

// ---------------------------------------------------------------------------
// Suite 4: Conflict-free chromosome — no-op path
// ---------------------------------------------------------------------------

describe("repairChromosome — conflict-free chromosome", () => {
    it("leaves a conflict-free chromosome unchanged", () => {
        /**
         * Two offerings in different rooms, different lecturers, different slots.
         * Repair should be a no-op: the returned assignments are identical.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2]),
            makeCandidate(2, 2, 11, [3, 4]),
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 2, assignedTimeSlotIds: [3] },
        ];

        const repaired = repairChromosome(chromosome, candidates);

        expect(repaired[0]!.assignedTimeSlotIds).toEqual([1]);
        expect(repaired[1]!.assignedTimeSlotIds).toEqual([3]);
    });
});

// ---------------------------------------------------------------------------
// Suite 5: Edge case — no alternative slot available
// ---------------------------------------------------------------------------

describe("repairChromosome — edge case: no alternative slot", () => {
    it("returns a valid chromosome even when no conflict-free slot exists", () => {
        /**
         * Only one possible slot (slot 1) for both genes in the same room.
         * The repair cannot eliminate the conflict, but must still return a
         * well-formed chromosome (correct length, valid slot references).
         *
         * We assert structural correctness, not zero violations — the repair's
         * least-bad strategy guarantees the chromosome structure is intact.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1]), // only slot 1 available
            makeCandidate(2, 1, 11, [1]), // only slot 1 available
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 2, assignedTimeSlotIds: [1] },
        ];

        // Should not throw despite being an unresolvable conflict
        expect(() => repairChromosome(chromosome, candidates)).not.toThrow();

        const repaired = repairChromosome(chromosome, candidates);

        // Structure must be intact: two genes, each with one slot assignment
        expect(repaired.length).toBe(2);
        expect(repaired[0]!.assignedTimeSlotIds.length).toBe(1);
        expect(repaired[1]!.assignedTimeSlotIds.length).toBe(1);

        // Slots must still be within the possible set (no invented slots)
        expect([1]).toContain(repaired[0]!.assignedTimeSlotIds[0]!);
        expect([1]).toContain(repaired[1]!.assignedTimeSlotIds[0]!);
    });
});

// ---------------------------------------------------------------------------
// Suite 6: Edge case — gene with unknown offeringId
// ---------------------------------------------------------------------------

describe("repairChromosome — edge case: unknown offeringId", () => {
    it("skips genes whose offeringId has no matching candidate", () => {
        /**
         * Gene 0 has a valid candidate; gene 1 references an offeringId (99)
         * that is NOT in the candidates array. The repair should silently skip
         * gene 1 and still repair gene 0 normally.
         */
        const candidates: PreGACandidate[] = [
            makeCandidate(1, 1, 10, [1, 2]),
        ];

        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
            { offeringId: 99, assignedTimeSlotIds: [1] }, // orphan gene
        ];

        expect(() => repairChromosome(chromosome, candidates)).not.toThrow();

        const repaired = repairChromosome(chromosome, candidates);

        // Both genes must still be present in the output
        expect(repaired.length).toBe(2);

        // The orphan gene's data should be preserved as-is (not corrupted)
        expect(repaired[1]!.offeringId).toBe(99);
    });
});

// ---------------------------------------------------------------------------
// Suite 7: Empty chromosome
// ---------------------------------------------------------------------------

describe("repairChromosome — edge case: empty inputs", () => {
    it("returns an empty array for an empty chromosome", () => {
        expect(repairChromosome([], [])).toEqual([]);
    });

    it("returns the chromosome unchanged when candidates array is empty", () => {
        /**
         * No candidate metadata means no conflict detection is possible.
         * The chromosome should come back intact.
         */
        const chromosome: Chromosome = [
            { offeringId: 1, assignedTimeSlotIds: [1] },
        ];

        const repaired = repairChromosome(chromosome, []);

        expect(repaired.length).toBe(1);
        expect(repaired[0]!.assignedTimeSlotIds).toEqual([1]);
    });
});
