import type { Chromosome, Gene } from "../ga/chromosome.js";

/**
 * Partially Mapped Crossover (PMX) adapted for schedule chromosomes.
 *
 * Each gene carries an `offeringId` (position is fixed, same for both parents)
 * and `assignedTimeSlotIds` (the "value" being evolved).
 *
 * PMX logic applied to time-slot assignments:
 *   1. Pick two random cut points [lo, hi) within the chromosome.
 *   2. Copy the segment [lo, hi) from each parent directly into the
 *      corresponding child.
 *   3. For positions outside the segment, try to keep the gene from
 *      the same parent.  If that time-slot assignment was already placed
 *      inside the segment (conflict), follow the PMX mapping chain to
 *      find a conflict-free substitute from the other parent's segment.
 *
 * Because each gene's `assignedTimeSlotIds` can hold *multiple* slot IDs,
 * the mapping is built over the first (primary) time-slot of each gene.
 * Genes that require only one session unambiguously benefit from this;
 * multi-session genes fall back to copying from the preferred parent
 * unchanged when no simple mapping exists.
 */
export function partiallyMappedCrossover(
  parent1: Chromosome,
  parent2: Chromosome
): [Chromosome, Chromosome] {
  if (parent1.length !== parent2.length) {
    throw new Error("Parents must have the same length for PMX.");
  }

  const n = parent1.length;
  if (n < 2) return [[...parent1], [...parent2]];

  // Pick two distinct cut points
  let lo = Math.floor(Math.random() * n);
  let hi = Math.floor(Math.random() * n);
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo === hi) {
    hi = Math.min(hi + 1, n - 1);
    if (lo === hi) lo = Math.max(lo - 1, 0);
  }

  // Build a mapping between the primary time-slot IDs in the swapped segment.
  // mapping1to2: if gene i inside [lo,hi] has primarySlot S in p1 and S' in
  // p2, then meeting S in p1 outside the segment should be replaced by S'.
  const primarySlot = (gene: Gene): number => gene.assignedTimeSlotIds[0] ?? -1;

  const mapping1to2 = new Map<number, number>(); // p1 primary → p2 primary (for child1)
  const mapping2to1 = new Map<number, number>(); // p2 primary → p1 primary (for child2)

  for (let i = lo; i <= hi; i++) {
    const s1 = primarySlot(parent1[i]!);
    const s2 = primarySlot(parent2[i]!);
    if (s1 !== -1 && s2 !== -1) {
      mapping1to2.set(s2, s1); // child1 inherits p1 segment → map p2 value to p1 value
      mapping2to1.set(s1, s2); // child2 inherits p2 segment → map p1 value to p2 value
    }
  }

  /**
   * Resolve a conflict: if the desired primary slot is already used inside the
   * copied segment, follow the mapping chain until we find a free slot.
   */
  function resolveSlot(
    slot: number,
    mapping: Map<number, number>,
    segmentSlots: Set<number>
  ): number {
    let resolved = slot;
    const visited = new Set<number>();
    while (segmentSlots.has(resolved)) {
      if (visited.has(resolved)) break; // cycle guard
      visited.add(resolved);
      const mapped = mapping.get(resolved);
      if (mapped === undefined) break;
      resolved = mapped;
    }
    return resolved;
  }

  // Collect the sets of primary slots already occupying the copied segments
  const segmentSlotsFromP1 = new Set<number>();
  const segmentSlotsFromP2 = new Set<number>();
  for (let i = lo; i <= hi; i++) {
    segmentSlotsFromP1.add(primarySlot(parent1[i]!));
    segmentSlotsFromP2.add(primarySlot(parent2[i]!));
  }

  const child1: Chromosome = new Array(n);
  const child2: Chromosome = new Array(n);

  for (let i = 0; i < n; i++) {
    if (i >= lo && i <= hi) {
      // Inside segment: child1 takes from p1, child2 takes from p2
      child1[i] = { ...parent1[i]!, assignedTimeSlotIds: [...parent1[i]!.assignedTimeSlotIds] };
      child2[i] = { ...parent2[i]!, assignedTimeSlotIds: [...parent2[i]!.assignedTimeSlotIds] };
    } else {
      // Outside segment: child1 prefers p2's gene, child2 prefers p1's gene.
      // (Opposite parent fills the outside, consistent with classic PMX.)
      const geneForChild1 = parent2[i]!;
      const geneForChild2 = parent1[i]!;

      const ps1 = primarySlot(geneForChild1);
      const ps2 = primarySlot(geneForChild2);

      // Resolve conflicts via mapping chain
      const resolvedSlotForChild1 = segmentSlotsFromP1.has(ps1)
        ? resolveSlot(ps1, mapping1to2, segmentSlotsFromP1)
        : ps1;

      const resolvedSlotForChild2 = segmentSlotsFromP2.has(ps2)
        ? resolveSlot(ps2, mapping2to1, segmentSlotsFromP2)
        : ps2;

      // Rebuild the gene: replace primary slot if it changed, keep extra slots as-is
      child1[i] = buildResolvedGene(geneForChild1, ps1, resolvedSlotForChild1);
      child2[i] = buildResolvedGene(geneForChild2, ps2, resolvedSlotForChild2);
    }
  }

  return [child1, child2];
}

/** Rebuild a gene replacing the primary slot with `resolvedSlot` if it differs. */
function buildResolvedGene(gene: Gene, originalPrimary: number, resolvedPrimary: number): Gene {
  if (originalPrimary === resolvedPrimary) {
    return { ...gene, assignedTimeSlotIds: [...gene.assignedTimeSlotIds] };
  }
  const slots = gene.assignedTimeSlotIds.map(s =>
    s === originalPrimary ? resolvedPrimary : s
  );
  return { offeringId: gene.offeringId, assignedTimeSlotIds: slots };
}
