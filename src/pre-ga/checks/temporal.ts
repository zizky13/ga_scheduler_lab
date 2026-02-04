type TemporalCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export function checkTemporalSufficiency(
  offering: any,
  requiredSessions: number
): TemporalCheckResult {
  const availableSessions = offering.totalSessions;

  if (availableSessions < requiredSessions) {
    return {
      ok: false,
      reason: `TEMPORAL_FAIL: butuh ${requiredSessions} sesi, tersedia ${availableSessions}`,
    };
  }

  return { ok: true };
}