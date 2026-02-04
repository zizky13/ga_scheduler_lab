-- CreateTable
CREATE TABLE "Lecturer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isStructural" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "ProgramStudy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Course" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "requiresSpecialRoom" BOOLEAN NOT NULL,
    "programStudyId" INTEGER NOT NULL,
    CONSTRAINT "Course_programStudyId_fkey" FOREIGN KEY ("programStudyId") REFERENCES "ProgramStudy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Room" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "roomType" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RoomFacility" (
    "roomId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,

    PRIMARY KEY ("roomId", "facilityId"),
    CONSTRAINT "RoomFacility_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseFacilityRequirement" (
    "courseId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,

    PRIMARY KEY ("courseId", "facilityId"),
    CONSTRAINT "CourseFacilityRequirement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseFacilityRequirement_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "academicYear" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "effectiveStudentCount" INTEGER NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "isParallel" BOOLEAN NOT NULL,
    "courseId" INTEGER NOT NULL,
    "roomId" INTEGER,
    CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CourseOffering_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseOfferingLecturer" (
    "offeringId" INTEGER NOT NULL,
    "lecturerId" INTEGER NOT NULL,

    PRIMARY KEY ("offeringId", "lecturerId"),
    CONSTRAINT "CourseOfferingLecturer_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseOfferingLecturer_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
