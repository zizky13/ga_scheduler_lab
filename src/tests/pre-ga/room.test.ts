import { describe, it, expect } from "vitest";
import { checkRoomCapacityUPJ } from "../../pre-ga/checks/room.js";

describe("Room Capacity Check (UPJ)", () => {
  it("HITUNG requiredSessions dengan benar", () => {
    const offering = {
      effectiveStudentCount: 60,
      room: { capacity: 45 },
    };

    const result = checkRoomCapacityUPJ(offering);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requiredSessions).toBe(2);
    }
  });

  it("FAIL jika room tidak ada", () => {
    const offering = {
      effectiveStudentCount: 30,
      room: null,
    };

    const result = checkRoomCapacityUPJ(offering);
    expect(result.ok).toBe(false);
  });
});