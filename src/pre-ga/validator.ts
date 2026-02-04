import { prisma } from "../db/client.js";
import type { PreGAResult } from "./result.js";

// checks
import { checkDataIntegrity } from "./checks/integrity.js";
import { checkRoomCapacityUPJ } from "./checks/room.js";
import { checkTemporalSufficiency } from "./checks/temporal.js";
import { checkFacilityCompatibility } from "./checks/facility.js";

export async function runPreGA(): Promise<PreGAResult[]> {
    const offerings = await prisma.courseOffering.findMany({
    include: {
        course: {
        include: {
            facilityRequirements: true,
        },
        },
        room: {
        include: {
            facilities: true,
        },
        },
        lecturers: true,
    },
    });

  const results: PreGAResult[] = [];

  for (const offering of offerings) {
    // STEP 1 — Integrity
    const integrity = checkDataIntegrity(offering);
    if (!integrity.ok) {
      results.push({
        offeringId: offering.id,
        status: "INFEASIBLE",
        reason: integrity.reason,
      });
      continue;
    }

    // STEP 2 — Room (UPJ-aware)
    const roomResult = checkRoomCapacityUPJ(offering);
    if (!roomResult.ok) {
      results.push({
        offeringId: offering.id,
        status: "INFEASIBLE",
        reason: roomResult.reason,
      });
      continue;
    }

    // STEP 3 — Temporal Sufficiency
    const temporalResult = checkTemporalSufficiency(
      offering,
      roomResult.requiredSessions
    );

    if (!temporalResult.ok) {
      results.push({
        offeringId: offering.id,
        status: "INFEASIBLE",
        reason: temporalResult.reason,
      });
      continue;
    }

    // STEP 4 — Facility Compatibility
    const facilityResult = checkFacilityCompatibility(offering);
    if (!facilityResult.ok) {
      results.push({
        offeringId: offering.id,
        status: "INFEASIBLE",
        reason: facilityResult.reason,
      });
      continue;
    }



    // PASSED ALL PRE-GA CHECKS
    results.push({
      offeringId: offering.id,
      status: "FEASIBLE",
    });
  }

  return results;
}