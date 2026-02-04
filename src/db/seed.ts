import process from "process";
import { prisma } from "./client.js";

async function main() {
  console.log("🌱 Seeding database...");

  /**
   * CLEANUP (biar idempotent)
   */
  await prisma.courseOfferingLecturer.deleteMany();
  await prisma.courseFacilityRequirement.deleteMany();
  await prisma.roomFacility.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.course.deleteMany();
  await prisma.room.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.programStudy.deleteMany();
  await prisma.timeSlot.deleteMany();

  /**
   * PROGRAM STUDY
   */
  const informatika = await prisma.programStudy.create({
    data: { name: "Informatika" },
  });

  /**
   * FACILITIES
   */
  const lab = await prisma.facility.create({
    data: { name: "LAB", description: "Laboratorium Komputer" },
  });

  const projector = await prisma.facility.create({
    data: { name: "PROJECTOR" },
  });

  /**
   * ROOMS
   */
  const labRoom = await prisma.room.create({
    data: {
      name: "Lab Komputer 1",
      capacity: 40,
      roomType: "LAB",
      facilities: {
        create: [{ facilityId: lab.id }, { facilityId: projector.id }],
      },
    },
  });

  const smallRoom = await prisma.room.create({
    data: {
      name: "Ruang Kecil",
      capacity: 20,
      roomType: "CLASSROOM",
      facilities: {
        create: [{ facilityId: projector.id }],
      },
    },
  });

  /**
   * LECTURERS
   */
  const lecturerA = await prisma.lecturer.create({
    data: { name: "Dr. Andi", isStructural: false },
  });

  const lecturerB = await prisma.lecturer.create({
    data: { name: "Prof. Budi", isStructural: true },
  });

  /**
   * COURSES
   */
  const algoCourse = await prisma.course.create({
    data: {
      name: "Algoritma dan Struktur Data",
      credits: 3,
      requiresSpecialRoom: true,
      programStudyId: informatika.id,
      facilityRequirements: {
        create: [{ facilityId: lab.id }],
      },
    },
  });

  const ethicsCourse = await prisma.course.create({
    data: {
      name: "Etika Profesi",
      credits: 2,
      requiresSpecialRoom: false,
      programStudyId: informatika.id,
    },
  });

  /**
   * TIME SLOTS
   */
  await prisma.timeSlot.createMany({
    data: [
      { day: "MON", startTime: "08:00", endTime: "10:00" },
      { day: "MON", startTime: "10:00", endTime: "12:00" },
      { day: "TUE", startTime: "08:00", endTime: "10:00" },
    ],
  });

  /**
   * COURSE OFFERINGS
   */

  // ✅ FEASIBLE OFFERING
  const feasibleOffering = await prisma.courseOffering.create({
    data: {
      academicYear: "2025/2026",
      semester: "GANJIL",
      effectiveStudentCount: 35,
      totalSessions: 14,
      isParallel: false,
      courseId: algoCourse.id,
      roomId: labRoom.id,
      lecturers: {
        create: [{ lecturerId: lecturerA.id }],
      },
    },
  });

  // ❌ INFEASIBLE: kapasitas ruang kurang
  const roomFailOffering = await prisma.courseOffering.create({
    data: {
      academicYear: "2025/2026",
      semester: "GANJIL",
      effectiveStudentCount: 35,
      totalSessions: 14,
      isParallel: false,
      courseId: ethicsCourse.id,
      roomId: smallRoom.id, // capacity 20
      lecturers: {
        create: [{ lecturerId: lecturerA.id }],
      },
    },
  });

  // ❌ INFEASIBLE: butuh LAB tapi ruang bukan LAB
  const facilityFailOffering = await prisma.courseOffering.create({
    data: {
      academicYear: "2025/2026",
      semester: "GANJIL",
      effectiveStudentCount: 30,
      totalSessions: 14,
      isParallel: false,
      courseId: algoCourse.id,
      roomId: smallRoom.id, // no LAB
      lecturers: {
        create: [{ lecturerId: lecturerB.id }],
      },
    },
  });

  console.log("✅ Seed completed.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });