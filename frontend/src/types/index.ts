// ─── Domain Types ────────────────────────────────────────────────────────────

export interface Lecturer {
  id: number
  name: string
  isStructural: boolean
}

export interface ProgramStudy {
  id: number
  name: string
  courses?: Course[]
}

export interface Course {
  id: number
  name: string
  credits: number
  requiresSpecialRoom: boolean
  programStudyId: number
  facilityIds?: number[]
}

export interface Room {
  id: number
  name: string
  capacity: number
  roomType: 'CLASSROOM' | 'LAB' | string
  facilityIds?: number[]
}

export interface Facility {
  id: number
  name: string
  description?: string
}

export interface TimeSlot {
  id: number
  day: string
  startTime: string
  endTime: string
}

export interface Offering {
  id: number
  courseId: number
  academicYear: string
  semester: string
  effectiveStudentCount: number
  totalSessions: number
  isParallel: boolean
  roomId?: number
  lecturerIds?: number[]
}

// ─── Scheduler Types ─────────────────────────────────────────────────────────

export interface GAConfig {
  populationSize?: number
  generations?: number
  tournamentSize?: number
  mutationRate?: number
  elitismCount?: number
  crossover?: 'singlePoint' | 'uniform' | 'pmx'
}

export interface ScheduleEntry {
  offeringId: number
  courseName: string
  roomId: number
  roomName: string
  lecturerIds: number[]
  lecturerNames: string[]
  timeSlotIds: number[]
  timeSlots: TimeSlot[]
  locked?: boolean
}

export type ConflictType = 'ROOM_CONFLICT' | 'LECTURER_CONFLICT' | 'SOFT_VIOLATION'
export type ConflictSeverity = 'HARD' | 'SOFT'

export interface Conflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  description: string
  relatedOfferingIds: number[]
  day?: string
  time?: string
}

export interface DiversityInfo {
  uniqueSlotCount: number
  avgPoolSize: number
  overlapDensity: number
  rating: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface PreGASummary {
  feasible: number
  infeasible: number
  infeasibleDetails: { offeringId: number; reason: string }[]
}

export interface GAResult {
  crossoverUsed: string
  bestFitness: number
  hardViolations: number
  softPenalty: number
  history: number[]
  avgHistory: number[]
  entries: ScheduleEntry[]
}

export interface SchedulerRunResponse {
  preGASummary: PreGASummary
  diversity: DiversityInfo
  config: GAConfig
  bestResult: GAResult
}

export interface SchedulerCompareResponse {
  preGASummary: PreGASummary
  diversity: DiversityInfo
  config: GAConfig
  results: GAResult[]
  bestResult: GAResult
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}
