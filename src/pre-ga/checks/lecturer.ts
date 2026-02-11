type LecturerCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

const MAX_SESSIONS_STRUCTURAL = 8;

export function checkLecturerAvailability(offering: any): LecturerCheckResult {
  const lecturers = offering.lecturers ?? [];

  if (lecturers.length === 0) {
    return {
      ok: false,
      reason: "LECTURER_FAIL: Tidak ada dosen pengampu",
    };
  }

  // Jika offering FIXED dan punya timeslot (opsional ke depan),
  // cek konflik hard antar offering FIXED.
  // (Untuk sekarang kita skip karena timeslot detail belum dimodelkan di ScheduleEntry)

  // Hard cap untuk dosen struktural (konservatif)
  for (const ol of lecturers) {
    const lecturer = ol.lecturer;

    if (lecturer?.isStructural) {
      // totalSessions di offering ini adalah sesi yang akan dibebankan
      if (offering.totalSessions > MAX_SESSIONS_STRUCTURAL) {
        return {
          ok: false,
          reason:
            "LECTURER_FAIL: Beban sesi melebihi batas hard untuk dosen struktural",
        };
      }
    }
  }

  return { ok: true };
}