import { describe, it, expect } from "vitest";
import { checkLecturerAvailability } from "../../pre-ga/checks/lecturer.js";

describe("Lecturer Availability Check", () => {
  it("FAIL jika dosen struktural melebihi batas hard", () => {
    const offering = {
      totalSessions: 14,
      lecturers: [
        { lecturer: { isStructural: true } },
      ],
    };

    const result = checkLecturerAvailability(offering);
    expect(result.ok).toBe(false);
  });

  it("PASS jika dosen non-struktural", () => {
    const offering = {
      totalSessions: 14,
      lecturers: [
        { lecturer: { isStructural: false } },
      ],
    };

    const result = checkLecturerAvailability(offering);
    expect(result.ok).toBe(true);
  });
});