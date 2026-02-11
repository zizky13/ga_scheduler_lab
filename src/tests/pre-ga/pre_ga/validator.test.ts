import { describe, it, expect } from "vitest";
import { prisma } from "../../../db/client.js";
import { runPreGA } from "../../../pre-ga/validator.js";

describe("Pre-GA Validator Integration", () => {

    it("Should separate feasible and infeasible offerings", async () => {

    // --- Arrange minimal data ---
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

    const labRoom = await prisma.room.create({
      data: {
        name: "Lab Room",
        capacity: 45,
        roomType: "LAB",
        facilities: {
          create: [{ facilityId: lab.id }],
        },
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

    // ❌ Infeasible (facility mismatch)
    const badOffering = await prisma.courseOffering.create({
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

    // ✅ Feasible
    const goodOffering = await prisma.courseOffering.create({
      data: {
        academicYear: "2025/2026",
        semester: "GANJIL",
        effectiveStudentCount: 30,
        totalSessions: 14,
        isParallel: false,
        courseId: course.id,
        roomId: labRoom.id,
        lecturers: {
          create: [{ lecturerId: lecturer.id }],
        },
      },
    });



    const output = await runPreGA();
    const feasibleIds = output.feasible.map(f => f.offeringId);
    const infeasibleIds = output.infeasible.map(i => i.offeringId);

    expect(feasibleIds).toContain(goodOffering.id);
    expect(infeasibleIds).toContain(badOffering.id);
  });

});