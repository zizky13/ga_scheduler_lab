import { describe, it, expect } from "vitest";
import { checkTemporalSufficiency } from "../../pre-ga/checks/temporal.js";

describe("Temporal Sufficiency Check", () => {
  it("FAIL jika sesi tidak cukup", () => {
    const offering = { totalSessions: 1 };
    const result = checkTemporalSufficiency(offering, 2);

    expect(result.ok).toBe(false);
  });

  it("PASS jika sesi mencukupi", () => {
    const offering = { totalSessions: 3 };
    const result = checkTemporalSufficiency(offering, 2);

    expect(result.ok).toBe(true);
  });
});