import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import {
  Lock,
  Unlock,
  GripVertical,
  Pencil,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { useSchedulerStore } from '@/store/schedulerStore'
import { useTimeSlots } from '@/lib/hooks'
import { formatTime, cn } from '@/lib/utils'
import type { ScheduleEntry, TimeSlot } from '@/types'

// ─── Day ordering (bilingual: handles both English & Indonesian) ──────────────

const DAY_ORDER: Record<string, number> = {
  Monday: 0,   Senin:  0,  Mon: 0,
  Tuesday: 1,  Selasa: 1,  Tue: 1,
  Wednesday: 2, Rabu:  2,  Wed: 2,
  Thursday: 3, Kamis:  3,  Thu: 3,
  Friday: 4,   Jumat:  4,  Fri: 4,
  Saturday: 5, Sabtu:  5,  Sat: 5,
  Sunday: 6,   Minggu: 6,  Sun: 6,
}

// ─── Drag/Drop types ──────────────────────────────────────────────────────────

interface DragItem {
  offeringId: number
  fromSlotId: number
  entry: ScheduleEntry
}

interface DropTarget {
  slotId: number
  day: string
}

// ─── Conflict preview helper ──────────────────────────────────────────────────

function wouldConflict(offeringId: number, toSlotId: number, entries: ScheduleEntry[]): boolean {
  const me = entries.find(e => e.offeringId === offeringId)
  if (!me) return false
  return entries.some(other => {
    if (other.offeringId === offeringId) return false
    if (!other.timeSlotIds.includes(toSlotId)) return false
    if (other.roomId === me.roomId) return true
    return me.lecturerIds.some(id => other.lecturerIds.includes(id))
  })
}

function occupantsAt(slotId: number, entries: ScheduleEntry[]): ScheduleEntry[] {
  return entries.filter(e => e.timeSlotIds.includes(slotId))
}

// ─── Draggable card ───────────────────────────────────────────────────────────

function DraggableCard({
  entry,
  slotId,
  overlay = false,
  onEdit,
}: {
  entry: ScheduleEntry
  slotId: number
  overlay?: boolean
  onEdit: () => void
}) {
  const { conflicts, toggleLock } = useSchedulerStore()

  const myConflicts = conflicts.filter(c => c.relatedOfferingIds.includes(entry.offeringId))
  const hasHard = myConflicts.some(c => c.severity === 'HARD')
  const hasSoft = !hasHard && myConflicts.some(c => c.severity === 'SOFT')

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-${entry.offeringId}-${slotId}`,
    data: { offeringId: entry.offeringId, fromSlotId: slotId, entry } satisfies DragItem,
    disabled: !!entry.locked,
  })

  const style = overlay
    ? {}
    : { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.2 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl border px-2.5 py-2 select-none group transition-opacity bg-surface-900',
        hasHard  ? 'cell-hard border-red-500/40'
          : hasSoft  ? 'cell-soft border-amber-500/40'
          : 'cell-ok border-green-500/30',
        entry.locked && 'opacity-60',
        overlay && 'shadow-2xl rotate-1 scale-105',
      )}
    >
      {/* Conflict pulse dot */}
      {(hasHard || hasSoft) && (
        <span className={cn(
          'absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface-900',
          hasHard ? 'bg-red-400 animate-pulse' : 'bg-amber-400',
        )} />
      )}

      {/* Top action row */}
      <div className="flex items-center gap-1 mb-1">
        {/* Drag handle */}
        {!entry.locked && (
          <button
            {...listeners}
            {...attributes}
            title="Drag to move"
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 transition-colors touch-none shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={12} />
          </button>
        )}
        {entry.locked && <Lock size={10} className="text-primary-400 shrink-0" />}

        <p className={cn(
          'text-[11px] font-semibold leading-tight truncate flex-1',
          hasHard ? 'text-red-300' : hasSoft ? 'text-amber-300' : 'text-green-300',
        )}>
          {entry.courseName}
        </p>

        {/* Hover action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!entry.locked && (
            <button
              title="Edit room / details"
              onClick={e => { e.stopPropagation(); onEdit() }}
              className="p-0.5 rounded text-slate-500 hover:text-primary-400 transition-colors"
            >
              <Pencil size={11} />
            </button>
          )}
          <button
            title={entry.locked ? 'Unlock' : 'Lock'}
            onClick={e => { e.stopPropagation(); toggleLock(entry.offeringId) }}
            className="p-0.5 rounded text-slate-500 hover:text-primary-300 transition-colors"
          >
            {entry.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 truncate">{entry.lecturerNames[0] ?? '—'}</p>
      <p className="text-[10px] text-slate-500 truncate">{entry.roomName}</p>

      {hasHard && (
        <div className="flex items-center gap-1 mt-1">
          <XCircle size={9} className="text-red-400 shrink-0" />
          <p className="text-[9px] text-red-400">Hard conflict</p>
        </div>
      )}
      {hasSoft && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle size={9} className="text-amber-400 shrink-0" />
          <p className="text-[9px] text-amber-400">Soft violation</p>
        </div>
      )}
    </div>
  )
}

// ─── Droppable cell ───────────────────────────────────────────────────────────

function DroppableCell({
  slot,
  occupants,
  isDragActive,
  activeDragItem,
  conflictPreview,
  entries,
  onEdit,
}: {
  slot: TimeSlot
  occupants: ScheduleEntry[]
  isDragActive: boolean
  activeDragItem: DragItem | null
  conflictPreview: Map<number, boolean>
  entries: ScheduleEntry[]
  onEdit: (id: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${slot.day}-${slot.id}`,
    data: { slotId: slot.id, day: slot.day } satisfies DropTarget,
    disabled: false,
  })

  const isSelf = activeDragItem ? occupants.some(o => o.offeringId === activeDragItem.offeringId) : false
  const conflict = conflictPreview.get(slot.id) ?? false

  const borderClass = isDragActive && !isSelf
    ? conflict
      ? isOver
        ? 'border-red-500 bg-red-500/18 shadow-[0_0_0_2px_rgba(239,68,68,0.4)]'
        : 'border-red-500/40 bg-red-500/6 border-dashed'
      : isOver
      ? 'border-green-500 bg-green-500/12 shadow-[0_0_0_2px_rgba(34,197,94,0.4)]'
      : 'border-primary-500/25 bg-primary-500/4 border-dashed'
    : 'border-white/5'

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[90px] rounded-xl border p-1.5 transition-all duration-100 flex flex-col gap-1.5',
        borderClass,
      )}
    >
      {occupants.map(occupant => (
        <DraggableCard
          key={occupant.offeringId}
          entry={occupant}
          slotId={slot.id}
          onEdit={() => onEdit(occupant.offeringId)}
        />
      ))}

      {/* Drop hint text for empty cells while dragging */}
      {isDragActive && occupants.length === 0 && (
        <div className="h-full flex items-center justify-center pointer-events-none py-4">
          {conflict
            ? <XCircle size={14} className="text-red-500/50" />
            : <div className="w-6 h-px bg-white/10" />
          }
        </div>
      )}
    </div>
  )
}

// ─── Main grid ────────────────────────────────────────────────────────────────

export function ScheduleGrid() {
  const {
    entries,
    highlightedOfferingIds,
    updateEntry,
    setEditingOfferingId,
    conflicts: storeConflicts,
  } = useSchedulerStore()

  const { data: allSlots = [] } = useTimeSlots()

  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const STANDARD_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  // ── Derive actual days from the real entry data (bilingual-safe) ────────────
  const uniqueDays = useMemo(() => {
    const days = new Set<string>(STANDARD_DAYS)
    // Primary source: actual entries (these have the real day strings from DB)
    entries.forEach(e => e.timeSlots.forEach(ts => days.add(ts.day)))
    // Also add from allSlots so empty drop targets are available
    allSlots.forEach(s => days.add(s.day))
    
    // Clean up any extraneous permutations strictly so we don't get duplicates
    const dayMappings: Record<string, string> = {
      'Monday': 'Mon', 'Senin': 'Mon',
      'Tuesday': 'Tue', 'Selasa': 'Tue',
      'Wednesday': 'Wed', 'Rabu': 'Wed',
      'Thursday': 'Thu', 'Kamis': 'Thu',
      'Friday': 'Fri', 'Jumat': 'Fri',
      'Saturday': 'Sat', 'Sabtu': 'Sat',
      'Sunday': 'Sun', 'Minggu': 'Sun'
    }

    // Attempt to merge or drop duplicates
    Array.from(days).forEach(d => {
      if (dayMappings[d]) {
        days.delete(d)
        days.add(dayMappings[d])
      }
      if (DAY_ORDER[d] !== undefined && DAY_ORDER[d] >= 5) {
        // remove weekends
        days.delete(d)
      }
    })

    return [...days].sort((a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99))
  }, [entries, allSlots])

  // ── Slot matrix: (day|startTime) → TimeSlot ─────────────────────────────────
  // Built from entries FIRST (guaranteed correct IDs + day strings), then
  // supplemented by allSlots to add empty drop-target cells.
  const slotMatrix = useMemo<Map<string, TimeSlot>>(() => {
    const map = new Map<string, TimeSlot>()
    entries.forEach(e =>
      e.timeSlots.forEach(ts => {
        const key = `${ts.day}|${ts.startTime}`
        if (!map.has(key)) map.set(key, ts)
      })
    )
    allSlots.forEach(s => {
      const key = `${s.day}|${s.startTime}`
      if (!map.has(key)) map.set(key, s)
    })
    return map
  }, [entries, allSlots])

  // ── Sorted unique time rows ──────────────────────────────────────────────────
  const timeRows = useMemo<string[]>(() => {
    const times = new Set<string>()
    entries.forEach(e => e.timeSlots.forEach(ts => times.add(ts.startTime)))
    allSlots.forEach(s => times.add(s.startTime))
    return [...times].sort()
  }, [entries, allSlots])

  // Find end time for a given start time (from any slot)
  const endTimeFor = useMemo(() => {
    const m = new Map<string, string>()
    entries.forEach(e => e.timeSlots.forEach(ts => { if (!m.has(ts.startTime)) m.set(ts.startTime, ts.endTime) }))
    allSlots.forEach(s => { if (!m.has(s.startTime)) m.set(s.startTime, s.endTime) })
    return m
  }, [entries, allSlots])

  // ── Conflict preview while dragging ─────────────────────────────────────────
  const conflictPreview = useMemo<Map<number, boolean>>(() => {
    if (!activeDragItem) return new Map()
    // Hypothetically remove the dragged session from its current slot
    const hypothetical = entries.map(e => {
      if (e.offeringId !== activeDragItem.offeringId) return e
      return {
        ...e,
        timeSlotIds: e.timeSlotIds.filter(id => id !== activeDragItem.fromSlotId),
        timeSlots:   e.timeSlots.filter(ts => ts.id !== activeDragItem.fromSlotId),
      }
    })
    const map = new Map<number, boolean>()
    // Check every slot in the matrix
    slotMatrix.forEach(slot => {
      map.set(slot.id, wouldConflict(activeDragItem.offeringId, slot.id, hypothetical))
    })
    return map
  }, [activeDragItem, entries, slotMatrix])

  // ── DnD handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as DragItem)
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {}, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const item   = event.active.data.current as DragItem | undefined
    const target = event.over?.data.current   as DropTarget | undefined

    setActiveDragItem(null)

    if (!item || !target) return
    if (target.slotId === item.fromSlotId) return  // dropped on same slot

    const { offeringId, fromSlotId } = item
    const toSlotId = target.slotId

    // Find the target TimeSlot object from the matrix
    const toSlot = [...slotMatrix.values()].find(s => s.id === toSlotId)
    if (!toSlot) return

    const movingEntry = entries.find(e => e.offeringId === offeringId)!

    // Build new slot list for the moving entry (swap fromSlot with toSlot)
    const newSlots    = movingEntry.timeSlots.map(ts => ts.id === fromSlotId ? toSlot : ts)
    const newSlotIds  = newSlots.map(ts => ts.id)

    // Simply move the session to the new slot (no swapping, users can share the same time slot across different rooms)
    updateEntry(offeringId, { timeSlots: newSlots, timeSlotIds: newSlotIds })
  }, [entries, slotMatrix, updateEntry])

  // ── Empty states ─────────────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <div className="text-4xl">📅</div>
        <p className="text-sm">No schedule generated yet. Run the GA to see results here.</p>
      </div>
    )
  }

  const hardCount = storeConflicts.filter(c => c.severity === 'HARD').length
  const cols = uniqueDays.length

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">

        {/* Legend bar */}
        <div className="flex flex-wrap items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <GripVertical size={12} className="text-slate-500" />
            <span className="text-[11px] text-slate-500">Drag to reschedule</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-green-500/60 bg-green-500/20" />
            <span className="text-[11px] text-slate-500">Safe drop zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-red-500/60 bg-red-500/20" />
            <span className="text-[11px] text-slate-500">Conflict zone</span>
          </div>

          {hardCount > 0 ? (
            <div className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-red-500/10 border border-red-500/20">
              <XCircle size={11} className="text-red-400" />
              <span className="text-[11px] text-red-400 font-medium">
                {hardCount} conflict{hardCount > 1 ? 's' : ''} — drag to resolve
              </span>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-green-500/10 border border-green-500/20">
              <span className="text-[11px] text-green-400 font-medium">✓ No conflicts</span>
            </div>
          )}
        </div>

        {/* Timetable */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">

            {/* Day header row */}
            <div
              className="grid gap-1.5 mb-1.5"
              style={{ gridTemplateColumns: `68px repeat(${cols}, 1fr)` }}
            >
              <div /> {/* spacer for time label column */}
              {uniqueDays.map(day => {
                const count = entries.filter(e => e.timeSlots.some(ts => ts.day === day)).length
                return (
                  <div key={day} className="glass rounded-xl px-2 py-2 text-center">
                    <p className="text-[11px] font-semibold text-slate-200">{day}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{count} class{count !== 1 ? 'es' : ''}</p>
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            {timeRows.map((time, rowIdx) => {
              const endTime = endTimeFor.get(time)
              return (
                <motion.div
                  key={time}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIdx * 0.04, duration: 0.2 }}
                  className="grid gap-1.5 mb-1.5"
                  style={{ gridTemplateColumns: `68px repeat(${cols}, 1fr)` }}
                >
                  {/* Time label */}
                  <div className="flex flex-col items-end justify-start pt-2.5 pr-2.5">
                    <p className="text-[11px] font-mono font-medium text-slate-400">{formatTime(time)}</p>
                    {endTime && (
                      <p className="text-[9px] font-mono text-slate-600">{formatTime(endTime)}</p>
                    )}
                  </div>

                  {/* Day cells */}
                  {uniqueDays.map(day => {
                    const slot = slotMatrix.get(`${day}|${time}`)

                    // No slot defined for this (day, time): render an inert bg cell
                    if (!slot) {
                      return (
                        <div
                          key={day}
                          className="min-h-[90px] rounded-xl bg-white/[0.02] border border-white/4"
                        />
                      )
                    }

                    const occupants     = occupantsAt(slot.id, entries)
                    const isHighlighted = occupants.some(o => highlightedOfferingIds.has(o.offeringId))

                    return (
                      <div
                        key={day}
                        className={cn(
                          'transition-all duration-100 flex flex-col',
                          isHighlighted && 'ring-2 ring-primary-500/70 ring-offset-1 ring-offset-transparent rounded-xl',
                        )}
                      >
                        <DroppableCell
                          slot={slot}
                          occupants={occupants}
                          isDragActive={activeDragItem !== null}
                          activeDragItem={activeDragItem}
                          conflictPreview={conflictPreview}
                          entries={entries}
                          onEdit={setEditingOfferingId}
                        />
                      </div>
                    )
                  })}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease-out' }}>
        {activeDragItem && (
          <div className="w-[160px] pointer-events-none">
            <DraggableCard
              entry={activeDragItem.entry}
              slotId={activeDragItem.fromSlotId}
              overlay
              onEdit={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
