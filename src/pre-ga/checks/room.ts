type RoomCheckResult =
  | { ok: true; requiredSessions: number }
  | { ok: false; reason: string };

export function checkRoomCapacityUPJ(offering: any): RoomCheckResult {
  if (!offering.room) {
    return {
      ok: false,
      reason: "ROOM_FAIL: Belum ada ruang dialokasikan",
    };
  }

  const capacity = offering.room.capacity;
  const students = offering.effectiveStudentCount;

  if (capacity <= 0) {
    return {
      ok: false,
      reason: "ROOM_FAIL: Kapasitas ruang tidak valid",
    };
  }

  const requiredSessions = Math.ceil(students / capacity);

  return {
    ok: true,
    requiredSessions,
  };
}