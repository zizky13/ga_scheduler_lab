type FacilityCheckResult = | { ok: true } | { ok: false; reason: string };

export function checkFacilityCompatibility(offering: any): FacilityCheckResult {
  // Kalau belum ada room assigned, kita TIDAK gagal di sini.
  // GA nanti bisa memilih room yang compatible.
  if (!offering.room) {
    return { ok: true };
  }

  const requiredFacilities =
    offering.course?.facilityRequirements?.map((fr: any) => fr.facilityId) ?? [];

  // Kalau course tidak butuh facility khusus → langsung OK
  if (requiredFacilities.length === 0) {
    return { ok: true };
  }

  const roomFacilities =
    offering.room?.facilities?.map((rf: any) => rf.facilityId) ?? [];

  const missingFacilities = requiredFacilities.filter(
    (reqId: number) => !roomFacilities.includes(reqId)
  );

  if (missingFacilities.length > 0) {
    return {
      ok: false,
      reason: `FACILITY_FAIL: ruang tidak memenuhi ${missingFacilities.length} kebutuhan facility`,
    };
  }

  return { ok: true };
}