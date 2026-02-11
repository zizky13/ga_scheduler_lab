type PolicyCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export function checkAcademicPolicy(
  offering: any,
  requiredSessions: number
): PolicyCheckResult {
  /**
   * 1) NON-PARALLEL dianggap FIXED
   */
  if (offering.isParallel === false) {
    // FIXED class wajib punya room
    if (!offering.room) {
      return {
        ok: false,
        reason:
          "POLICY_FAIL: Kelas non-paralel (fixed) wajib memiliki ruang",
      };
    }

    // FIXED class tidak boleh kekurangan sesi
    if (offering.totalSessions < requiredSessions) {
      return {
        ok: false,
        reason:
          "POLICY_FAIL: Kelas non-paralel tidak cukup sesi untuk menampung mahasiswa",
      };
    }
  }

  /**
   * 2) Kelas paralel (UPJ): satu ruang, multi-session
   */
  if (offering.isParallel === true) {
    if (!offering.room) {
      return {
        ok: false,
        reason:
          "POLICY_FAIL: Kelas paralel wajib dialokasikan ke satu ruang",
      };
    }
  }

  /**
   * 3) Sanity akademik dasar
   */
  if (!offering.academicYear || !offering.semester) {
    return {
      ok: false,
      reason:
        "POLICY_FAIL: Tahun akademik atau semester tidak valid",
    };
  }

  return { ok: true };
}