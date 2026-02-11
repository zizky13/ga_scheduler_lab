import { describe, it, expect } from "vitest";
import { checkDataIntegrity } from "../../pre-ga/checks/integrity.js";

describe("Integrity Check", () => {
  it("FAIL jika tidak ada dosen", () => {
    const offering = {
      course: {},
      effectiveStudentCount: 30,
      totalSessions: 14,
      lecturers: [],
    };

    const result = checkDataIntegrity(offering);
    expect(result.ok).toBe(false);
  });

  it("PASS jika data minimum valid", () => {
    const offering = {
      course: {},
      effectiveStudentCount: 30,
      totalSessions: 14,
      lecturers: [{}],
    };

    const result = checkDataIntegrity(offering);
    expect(result.ok).toBe(true);
  });
});