import { prisma } from "./client.js";

async function resetDB() {
  await prisma.courseOfferingLecturer.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.course.deleteMany();
  await prisma.room.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.programStudy.deleteMany();
}

async function createProgram() {
  return prisma.programStudy.create({
    data: { name: "Informatika" }
  });
}

async function createLecturers(count: number) {
  const lecturers = [];

  for (let i = 0; i < count; i++) {
    lecturers.push(
      await prisma.lecturer.create({
        data: {
          name: `Lecturer ${i+1}`,
          isStructural: i < 2
        }
      })
    );
  }

  return lecturers;
}

async function createRooms(count: number) {
  const rooms = [];

  for (let i = 0; i < count; i++) {
    rooms.push(
      await prisma.room.create({
        data: {
          name: `Room ${i+1}`,
          capacity: 45,
          roomType: "CLASSROOM"
        }
      })
    );
  }

  return rooms;
}

async function createTimeslots(count: number) {
  const days = ["Mon","Tue","Wed","Thu","Fri"];
  const times = ["08:00","10:00","13:00","15:00"];

  const slots = [];

  let id = 0;

  for (const d of days) {
    for (const t of times) {

      if (id >= count) break;

      slots.push(
        await prisma.timeSlot.create({
          data: {
            day: d,
            startTime: t,
            endTime: "09:40"
          }
        })
      );

      id++;
    }
  }

  return slots;
}

async function createCourses(programId: number, count: number) {
  const courses = [];

  for (let i = 0; i < count; i++) {
    courses.push(
      await prisma.course.create({
        data: {
          name: `Course ${i+1}`,
          credits: 3,
          programStudyId: programId,
          requiresSpecialRoom: false
        }
      })
    );
  }

  return courses;
}

export async function seedEasy() {

  await resetDB();

  const program = await createProgram();
  const lecturers = await createLecturers(6);
  const rooms = await createRooms(5);
  const timeslots = await createTimeslots(12);
  const courses = await createCourses(program.id, 10);

  for (let i = 0; i < 10; i++) {

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: courses[i]!.id,
        roomId: rooms[i % rooms.length]!.id,
        academicYear: "2025/2026",
        semester: "GANJIL",
        effectiveStudentCount: 30,
        totalSessions: 1,
        isParallel: false
      }
    });

    await prisma.courseOfferingLecturer.create({
      data: {
        offeringId: offering.id,
        lecturerId: lecturers[i % lecturers.length]!.id
      }
    });
  }

  console.log("Easy dataset created");
}

export async function seedMedium() {

  await resetDB();

  const program = await createProgram();
  const lecturers = await createLecturers(6);
  const rooms = await createRooms(3);
  const timeslots = await createTimeslots(6);
  const courses = await createCourses(program.id, 12);

  for (let i = 0; i < 20; i++) {

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: courses[i % courses.length]!.id,
        roomId: rooms[i % rooms.length]!.id,
        academicYear: "2025/2026",
        semester: "GANJIL",
        effectiveStudentCount: 40,
        totalSessions: 1,
        isParallel: false
      }
    });

    await prisma.courseOfferingLecturer.create({
      data: {
        offeringId: offering.id,
        lecturerId: lecturers[i % lecturers.length]!.id
      }
    });
  }

  console.log("Medium dataset created");
}

export async function seedHard() {

  await resetDB();

  const program = await createProgram();
  const lecturers = await createLecturers(6);
  const rooms = await createRooms(3);
  const timeslots = await createTimeslots(5);
  const courses = await createCourses(program.id, 20);

  for (let i = 0; i < 40; i++) {

    const offering = await prisma.courseOffering.create({
      data: {
        courseId: courses[i % courses.length]!.id,
        roomId: rooms[i % rooms.length]!.id,
        academicYear: "2025/2026",
        semester: "GANJIL",
        effectiveStudentCount: 50,
        totalSessions: 1,
        isParallel: false
      }
    });

    await prisma.courseOfferingLecturer.create({
      data: {
        offeringId: offering.id,
        lecturerId: lecturers[i % lecturers.length]!.id
      }
    });
  }

  console.log("Hard dataset created");
}

async function main() {

  const type = process.argv[2];

  if (type === "easy") await seedEasy();
  else if (type === "medium") await seedMedium();
  else if (type === "hard") await seedHard();
  else console.log("Specify easy | medium | hard");

}

main();