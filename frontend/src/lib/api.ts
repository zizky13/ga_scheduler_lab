import axios from 'axios'
import type {
  ApiResponse,
  Lecturer,
  ProgramStudy,
  Course,
  Room,
  Facility,
  TimeSlot,
  Offering,
  GAConfig,
  SchedulerRunResponse,
  SchedulerCompareResponse,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ─── JWT request interceptor ─────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await api.get<ApiResponse<T>>(path, { params })
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Request failed')
  return res.data.data
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(path, body)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Request failed')
  return res.data.data
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiResponse<T>>(path, body)
  if (!res.data.success || !res.data.data) throw new Error(res.data.error?.message ?? 'Request failed')
  return res.data.data
}

async function del<T>(path: string): Promise<T> {
  const res = await api.delete<ApiResponse<T>>(path)
  if (!res.data.success) throw new Error(res.data.error?.message ?? 'Request failed')
  return res.data.data as T
}

// ─── Health ───────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => api.get('/health').then(r => r.data),
}

// ─── Lecturers ─────────────────────────────────────────────────────────────────

export const lecturersApi = {
  list: () => get<Lecturer[]>('/lecturers'),
  get: (id: number) => get<Lecturer>(`/lecturers/${id}`),
  create: (body: Omit<Lecturer, 'id'>) => post<Lecturer>('/lecturers', body),
  update: (id: number, body: Partial<Omit<Lecturer, 'id'>>) => put<Lecturer>(`/lecturers/${id}`, body),
  remove: (id: number) => del<void>(`/lecturers/${id}`),
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export const programsApi = {
  list: () => get<ProgramStudy[]>('/programs'),
  get: (id: number) => get<ProgramStudy>(`/programs/${id}`),
  create: (body: { name: string }) => post<ProgramStudy>('/programs', body),
  update: (id: number, body: { name: string }) => put<ProgramStudy>(`/programs/${id}`, body),
  remove: (id: number) => del<void>(`/programs/${id}`),
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export const coursesApi = {
  list: (programStudyId?: number) =>
    get<Course[]>('/courses', programStudyId ? { programStudyId: String(programStudyId) } : undefined),
  get: (id: number) => get<Course>(`/courses/${id}`),
  create: (body: Omit<Course, 'id'>) => post<Course>('/courses', body),
  update: (id: number, body: Partial<Omit<Course, 'id'>>) => put<Course>(`/courses/${id}`, body),
  remove: (id: number) => del<void>(`/courses/${id}`),
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const roomsApi = {
  list: (roomType?: string) =>
    get<Room[]>('/rooms', roomType ? { roomType } : undefined),
  get: (id: number) => get<Room>(`/rooms/${id}`),
  create: (body: Omit<Room, 'id'>) => post<Room>('/rooms', body),
  update: (id: number, body: Partial<Omit<Room, 'id'>>) => put<Room>(`/rooms/${id}`, body),
  remove: (id: number) => del<void>(`/rooms/${id}`),
}

// ─── Facilities ───────────────────────────────────────────────────────────────

export const facilitiesApi = {
  list: () => get<Facility[]>('/facilities'),
  get: (id: number) => get<Facility>(`/facilities/${id}`),
  create: (body: Omit<Facility, 'id'>) => post<Facility>('/facilities', body),
  update: (id: number, body: Partial<Omit<Facility, 'id'>>) => put<Facility>(`/facilities/${id}`, body),
  remove: (id: number) => del<void>(`/facilities/${id}`),
}

// ─── Time Slots ───────────────────────────────────────────────────────────────

export const timeSlotsApi = {
  list: (day?: string) => get<TimeSlot[]>('/timeslots', day ? { day } : undefined),
  get: (id: number) => get<TimeSlot>(`/timeslots/${id}`),
  create: (body: Omit<TimeSlot, 'id'>) => post<TimeSlot>('/timeslots', body),
  update: (id: number, body: Partial<Omit<TimeSlot, 'id'>>) => put<TimeSlot>(`/timeslots/${id}`, body),
  remove: (id: number) => del<void>(`/timeslots/${id}`),
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export const offeringsApi = {
  list: (params?: { academicYear?: string; semester?: string }) =>
    get<Offering[]>('/offerings', params as Record<string, string>),
  get: (id: number) => get<Offering>(`/offerings/${id}`),
  create: (body: Omit<Offering, 'id'>) => post<Offering>('/offerings', body),
  update: (id: number, body: Partial<Omit<Offering, 'id'>>) => put<Offering>(`/offerings/${id}`, body),
  remove: (id: number) => del<void>(`/offerings/${id}`),
  patchLecturers: (id: number, lecturerIds: number[]) =>
    api.patch<ApiResponse<Offering>>(`/offerings/${id}/lecturers`, { lecturerIds }),
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export const schedulerApi = {
  run: (config?: GAConfig) => post<SchedulerRunResponse>('/scheduler/run', config),
  compare: (config?: Omit<GAConfig, 'crossover'>) =>
    post<SchedulerCompareResponse>('/scheduler/compare', config),
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: { id: number; username: string; email: string; role: string }
}

export const authApi = {
  login: (username: string, password: string) =>
    post<LoginResponse>('/auth/login', { username, password }),
  me: () => get<LoginResponse['user']>('/auth/me'),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
}
