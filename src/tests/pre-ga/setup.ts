import { beforeAll, afterAll } from "vitest";
import { prisma } from "../../db/client.js";

beforeAll(async () => {
  // pastikan test DB clean
  await prisma.courseOfferingLecturer.deleteMany();
  await prisma.courseFacilityRequirement.deleteMany();
  await prisma.roomFacility.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.course.deleteMany();
  await prisma.room.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.programStudy.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});