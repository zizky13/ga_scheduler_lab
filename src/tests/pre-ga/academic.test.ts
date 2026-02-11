import { describe, it, expect } from "vitest";
import { checkAcademicPolicy } from "../../pre-ga/checks/policy.js";

describe("Academic Policy Check (UPJ)", () => {
  it("FAIL jika non-parallel tanpa room", () => {
    const offering = {
      isParallel: false,
      totalSessions: 1,
      academicYear: "2025/2026",
      semester: "GANJIL",
      room: null,
    };

    const result = checkAcademicPolicy(offering, 1);
    expect(result.ok).toBe(false);
  });

  it("PASS untuk kelas paralel dengan room", () => {
    const offering = {
      isParallel: true,
      totalSessions: 2,
      academicYear: "2025/2026",
      semester: "GANJIL",
      room: {},
    };

    const result = checkAcademicPolicy(offering, 2);
    expect(result.ok).toBe(true);
  });
});