import { describe, it, expect } from "vitest";
import { prisma } from "../../../db/client.js";
import { runPreGA } from "../../../pre-ga/validator.js";

describe("Pre-GA Validator Integration", () => {

  it("Should mark facility-mismatch offering as INFEASIBLE", async () => {
    const program = await prisma.programStudy.create({
      data: { name: "Informatika" },
    });

    const lab = await prisma.facility.create({
      data: { name: "LAB" },
    });

    const classroom = await prisma.room.create({
      data: {
        name: "Classroom",
        capacity: 45,
        roomType: "CLASSROOM",
      },
    });

    const course = await prisma.course.create({
      data: {
        name: "Algoritma",
        credits: 3,
        requiresSpecialRoom: true,
        programStudyId: program.id,
        facilityRequirements: {
          create: [{ facilityId: lab.id }],
        },
      },
    });

    const lecturer = await prisma.lecturer.create({
      data: { name: "Dr A", isStructural: false },
    });

    const offering = await prisma.courseOffering.create({
      data: {
        academicYear: "2025/2026",
        semester: "GANJIL",
        effectiveStudentCount: 30,
        totalSessions: 14,
        isParallel: false,
        courseId: course.id,
        roomId: classroom.id,
        lecturers: {
          create: [{ lecturerId: lecturer.id }],
        },
      },
    });

    const results = await runPreGA();

    const tested = results.find(r => r.offeringId === offering.id);

    expect(tested?.status).toBe("INFEASIBLE");
    expect(tested?.reason).toContain("FACILITY_FAIL");
  });

});