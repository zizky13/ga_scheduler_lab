import { create } from 'zustand'
import type { ScheduleEntry, GAResult, PreGASummary, DiversityInfo, GAConfig, Conflict } from '@/types'

// ─── Derived conflict computation ─────────────────────────────────────────────

function deriveConflicts(entries: ScheduleEntry[]): Conflict[] {
  const conflicts: Conflict[] = []
  let idCounter = 0

  // Room conflicts: same room, same time slot
  const roomSlotMap = new Map<string, ScheduleEntry[]>()
  entries.forEach(e => {
    e.timeSlots.forEach(ts => {
      const key = `room:${e.roomId}:ts:${ts.id}`
      if (!roomSlotMap.has(key)) roomSlotMap.set(key, [])
      roomSlotMap.get(key)!.push(e)
    })
  })
  roomSlotMap.forEach((group, key) => {
    if (group.length > 1) {
      const ts = group[0].timeSlots.find(t => key.includes(`ts:${t.id}`))
      conflicts.push({
        id: `c-${++idCounter}`,
        type: 'ROOM_CONFLICT',
        severity: 'HARD',
        description: `Room conflict: ${group.map(e => e.courseName).join(' vs ')} — ${group[0].roomName}`,
        relatedOfferingIds: group.map(e => e.offeringId),
        day: ts?.day,
        time: ts ? `${ts.startTime}–${ts.endTime}` : undefined,
      })
    }
  })

  // Lecturer conflicts: same lecturer, same time slot
  const lecturerSlotMap = new Map<string, ScheduleEntry[]>()
  entries.forEach(e => {
    e.lecturerIds.forEach(lid => {
      e.timeSlots.forEach(ts => {
        const key = `lec:${lid}:ts:${ts.id}`
        if (!lecturerSlotMap.has(key)) lecturerSlotMap.set(key, [])
        lecturerSlotMap.get(key)!.push(e)
      })
    })
  })
  lecturerSlotMap.forEach((group, key) => {
    if (group.length > 1) {
      const lecId = key.split(':')[1]
      const lecName = group[0].lecturerNames.find((_, i) => String(group[0].lecturerIds[i]) === lecId) ?? 'Unknown'
      const ts = group[0].timeSlots.find(t => key.includes(`ts:${t.id}`))
      conflicts.push({
        id: `c-${++idCounter}`,
        type: 'LECTURER_CONFLICT',
        severity: 'HARD',
        description: `Lecturer double-booked: ${lecName} — ${group.map(e => e.courseName).join(' vs ')}`,
        relatedOfferingIds: group.map(e => e.offeringId),
        day: ts?.day,
        time: ts ? `${ts.startTime}–${ts.endTime}` : undefined,
      })
    }
  })

  return conflicts
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SchedulerState {
  // Run state
  isRunning: boolean
  runError: string | null

  // Results
  gaResult: GAResult | null
  preGASummary: PreGASummary | null
  diversity: DiversityInfo | null
  usedConfig: GAConfig | null

  // Derived
  entries: ScheduleEntry[]   // with locked flag preserved
  conflicts: Conflict[]

  // UI selection
  selectedConflictId: string | null
  highlightedOfferingIds: Set<number>

  // Actions
  setRunning: (v: boolean) => void
  setError: (e: string | null) => void
  setResults: (result: GAResult, preGA: PreGASummary, diversity: DiversityInfo, config: GAConfig) => void
  toggleLock: (offeringId: number) => void
  selectConflict: (id: string | null) => void
  clearResults: () => void
}

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  isRunning: false,
  runError: null,
  gaResult: null,
  preGASummary: null,
  diversity: null,
  usedConfig: null,
  entries: [],
  conflicts: [],
  selectedConflictId: null,
  highlightedOfferingIds: new Set(),

  setRunning: (v) => set({ isRunning: v, runError: null }),
  setError: (e) => set({ runError: e, isRunning: false }),

  setResults: (result, preGA, diversity, config) => {
    const entries = result.entries.map(e => ({
      ...e,
      locked: get().entries.find(ex => ex.offeringId === e.offeringId)?.locked ?? false,
    }))
    const conflicts = deriveConflicts(entries)
    set({
      gaResult: result,
      preGASummary: preGA,
      diversity,
      usedConfig: config,
      entries,
      conflicts,
      isRunning: false,
      runError: null,
      selectedConflictId: null,
      highlightedOfferingIds: new Set(),
    })
  },

  toggleLock: (offeringId) => {
    set(state => ({
      entries: state.entries.map(e =>
        e.offeringId === offeringId ? { ...e, locked: !e.locked } : e
      ),
    }))
  },

  selectConflict: (id) => {
    if (!id) {
      set({ selectedConflictId: null, highlightedOfferingIds: new Set() })
      return
    }
    const conflict = get().conflicts.find(c => c.id === id)
    set({
      selectedConflictId: id,
      highlightedOfferingIds: new Set(conflict?.relatedOfferingIds ?? []),
    })
  },

  clearResults: () => set({
    gaResult: null,
    preGASummary: null,
    diversity: null,
    usedConfig: null,
    entries: [],
    conflicts: [],
    selectedConflictId: null,
    highlightedOfferingIds: new Set(),
    runError: null,
  }),
}))
