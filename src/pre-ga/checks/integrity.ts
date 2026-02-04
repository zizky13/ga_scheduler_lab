type IntegrityCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export function checkDataIntegrity(offering: any): IntegrityCheckResult{
  if (!offering.course) {
    return { ok: false, reason: "INTEGRITY_FAIL: Course tidak ditemukan" };
  }

  if (offering.effectiveStudentCount <= 0) {
    return { ok: false, reason: "INTEGRITY_FAIL: Jumlah mahasiswa tidak valid" };
  }

  if (offering.totalSessions <= 0) {
    return { ok: false, reason: "INTEGRITY_FAIL: Total sesi tidak valid" };
  }

  if (!offering.lecturers || offering.lecturers.length === 0) {
    return { ok: false, reason: "INTEGRITY_FAIL: Tidak ada dosen pengampu" };
  }

  return { ok: true };
}