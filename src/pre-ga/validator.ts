import { prisma } from "../db/client.js";
import type { PreGAResult } from "./result.js";
import type { PreGACandidate, PreGAOutput } from "./candidate.js";

// checks
import { checkDataIntegrity } from "./checks/integrity.js";
import { checkRoomCapacityUPJ } from "./checks/room.js";
import { checkTemporalSufficiency } from "./checks/temporal.js";
import { checkFacilityCompatibility } from "./checks/facility.js";
import { checkLecturerAvailability } from "./checks/lecturer.js";
import { checkAcademicPolicy } from "./checks/policy.js";

export async function runPreGA(): Promise<PreGAOutput> {
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
        lecturers: {
        include: {
            lecturer: true,
        },
        },
    },
    });

  const allTimeSlots = await prisma.timeSlot.findMany();
  const feasible: PreGACandidate[] = [];
  const infeasible: { offeringId: number; reason: string }[] = [];


  for (const offering of offerings) {
    // STEP 1 — Integrity
    const integrity = checkDataIntegrity(offering);
    if (!integrity.ok) {
      infeasible.push({
        offeringId: offering.id,
        reason: integrity.reason,
      });
      continue;
    }

    // STEP 2 — Room (UPJ-aware)
    const roomResult = checkRoomCapacityUPJ(offering);
    if (!roomResult.ok) {
      infeasible.push({
        offeringId: offering.id,
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
      infeasible.push({
        offeringId: offering.id,
        reason: temporalResult.reason,
      });
      continue;
    }

    // STEP 4 — Facility Compatibility
    const facilityResult = checkFacilityCompatibility(offering);
    if (!facilityResult.ok) {
      infeasible.push({
        offeringId: offering.id,
        reason: facilityResult.reason,
      });
      continue;
    }

    // STEP 5 — Lecturer Availability
    const lecturerResult = checkLecturerAvailability(offering);

    if (!lecturerResult.ok) {
    infeasible.push({
        offeringId: offering.id,
        reason: lecturerResult.reason,
    });
    continue;
    }

    // STEP 6 — Academic Policy
    const policyResult = checkAcademicPolicy(
    offering,
    roomResult.requiredSessions
    );

    if (!policyResult.ok) {
    infeasible.push({
        offeringId: offering.id,
        reason: policyResult.reason,
    });
    continue;
    }

    // PASSED ALL PRE-GA CHECKS
    feasible.push({
      offeringId: offering.id,
      requiredSessions: roomResult.requiredSessions,
      roomId: offering.room!.id,
      lecturerIds: offering.lecturers.map(l => l.lecturer.id),
      possibleTimeSlotIds: allTimeSlots.map(t => t.id),
    });
  }

  return {feasible, infeasible};
}