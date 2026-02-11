import { describe, it, expect } from "vitest";
import { checkFacilityCompatibility } from "../../pre-ga/checks/facility.js";

describe("Facility Compatibility Check", () => {
  it("FAIL jika room tidak punya facility yang dibutuhkan", () => {
    const offering = {
      course: {
        facilityRequirements: [{ facilityId: 1 }],
      },
      room: {
        facilities: [{ facilityId: 2 }],
      },
    };

    const result = checkFacilityCompatibility(offering);
    expect(result.ok).toBe(false);
  });

  it("PASS jika semua facility terpenuhi", () => {
    const offering = {
      course: {
        facilityRequirements: [{ facilityId: 1 }],
      },
      room: {
        facilities: [{ facilityId: 1 }],
      },
    };

    const result = checkFacilityCompatibility(offering);
    expect(result.ok).toBe(true);
  });
});