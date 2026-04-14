import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Pencil,
  GripVertical,
  Info,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useSchedulerStore } from '@/store/schedulerStore'
import { useTimeSlots, useRooms } from '@/lib/hooks'
import { DAYS, formatTime, cn } from '@/lib/utils'
import type { TimeSlot, Room, ScheduleEntry } from '@/types'

// ─── Conflict preview helpers ─────────────────────────────────────────────────

function previewConflicts(
  offeringId: number,
  draftSlots: TimeSlot[],
  draftRoomId: number,
  entries: ScheduleEntry[],
) {
  const roomConflicts: string[] = []
  const lecturerConflicts: string[] = []

  const thisEntry = entries.find((e: ScheduleEntry) => e.offeringId === offeringId)
  if (!thisEntry) return { roomConflicts, lecturerConflicts }

  draftSlots.forEach(draftTs => {
    entries.forEach((other: ScheduleEntry) => {
      if (other.offeringId === offeringId) return
      const clash = other.timeSlots.some((ts: TimeSlot) => ts.id === draftTs.id)
      if (!clash) return

      if (other.roomId === draftRoomId)
        roomConflicts.push(`${other.courseName} is in ${other.roomName} at ${draftTs.day} ${formatTime(draftTs.startTime)}`)

      const sharedLecturers = thisEntry.lecturerIds.filter((id: number) => other.lecturerIds.includes(id))
      sharedLecturers.forEach((lid: number) => {
        const name = thisEntry.lecturerNames[thisEntry.lecturerIds.indexOf(lid)] ?? 'Lecturer'
        lecturerConflicts.push(`${name} also teaches ${other.courseName} at ${draftTs.day} ${formatTime(draftTs.startTime)}`)
      })
    })
  })

  return { roomConflicts, lecturerConflicts }
}

function roomWouldConflict(
  offeringId: number,
  roomId: number,
  draftSlots: TimeSlot[],
  entries: ScheduleEntry[],
) {
  return entries.some(other => {
    if (other.offeringId === offeringId) return false
    if (other.roomId !== roomId) return false
    return draftSlots.some(ds => other.timeSlots.some(ts => ts.id === ds.id))
  })
}

// ─── Time Slot Picker ──────────────────────────────────────────────────────────

interface SlotPickerProps {
  allSlots: TimeSlot[]
  neededCount: number
  selectedIds: number[]
  offeringId: number
  draftRoomId: number
  entries: ScheduleEntry[]
  onChange: (ids: number[], slots: TimeSlot[]) => void
}

function SlotPicker({ allSlots, neededCount, selectedIds, offeringId, draftRoomId, entries, onChange }: SlotPickerProps) {
  const byDay = DAYS.reduce<Record<string, TimeSlot[]>>((acc, d) => {
    acc[d] = allSlots.filter(ts => ts.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime))
    return acc
  }, {})

  function toggle(ts: TimeSlot) {
    let next: number[]
    if (selectedIds.includes(ts.id)) {
      next = selectedIds.filter(id => id !== ts.id)
    } else {
      next = selectedIds.length >= neededCount
        ? [...selectedIds.slice(1), ts.id]
        : [...selectedIds, ts.id]
    }
    onChange(next, allSlots.filter(s => next.includes(s.id)))
  }

  return (
    <div className="space-y-2.5">
      {DAYS.map(day => (
        <div key={day}>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{day}</p>
          <div className="flex flex-wrap gap-1">
            {byDay[day].map(ts => {
              const isSelected = selectedIds.includes(ts.id)
              const { roomConflicts, lecturerConflicts } = previewConflicts(offeringId, [ts], draftRoomId, entries)
              const hasConflict = roomConflicts.length > 0 || lecturerConflicts.length > 0
              const tip = roomConflicts[0] ?? lecturerConflicts[0] ?? undefined

              return (
                <motion.button
                  key={ts.id}
                  whileTap={{ scale: 0.93 }}
                  title={tip}
                  onClick={() => toggle(ts)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all duration-100',
                    isSelected
                      ? 'bg-primary-600/35 border-primary-500/60 text-primary-200 ring-1 ring-primary-500/50'
                      : hasConflict
                      ? 'bg-red-500/12 border-red-500/30 text-red-400 hover:bg-red-500/20'
                      : 'glass-light border-white/8 text-slate-300 hover:border-primary-500/40 hover:text-primary-300',
                  )}
                >
                  {formatTime(ts.startTime)}
                  {hasConflict && !isSelected && <span className="ml-1">⚠</span>}
                </motion.button>
              )
            })}
            {byDay[day].length === 0 && (
              <p className="text-[10px] text-slate-600 italic">No defined slots</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Room Picker ───────────────────────────────────────────────────────────────

interface RoomPickerProps {
  allRooms: Room[]
  selectedRoomId: number
  offeringId: number
  draftSlots: TimeSlot[]
  entries: ScheduleEntry[]
  onChange: (room: Room) => void
}

function RoomPicker({ allRooms, selectedRoomId, offeringId, draftSlots, entries, onChange }: RoomPickerProps) {
  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
      {allRooms.map(room => {
        const isSelected = room.id === selectedRoomId
        const hasConflict = roomWouldConflict(offeringId, room.id, draftSlots, entries)

        return (
          <motion.button
            key={room.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(room)}
            className={cn(
              'w-full text-left rounded-xl px-3 py-2 border flex items-center gap-3 transition-all duration-100',
              isSelected
                ? 'bg-primary-600/25 border-primary-500/50 text-primary-200 ring-1 ring-primary-500/30'
                : hasConflict
                ? 'bg-red-500/8 border-red-500/20 text-slate-400 hover:bg-red-500/15'
                : 'glass-light border-white/6 text-slate-300 hover:border-primary-500/30 hover:text-slate-100',
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{room.name}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{room.roomType} · capacity {room.capacity}</p>
            </div>
            {isSelected && <CheckCircle2 size={14} className="text-primary-400 shrink-0" />}
            {hasConflict && !isSelected && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-primary-400 shrink-0" />
      <p className="text-xs font-semibold text-slate-200">{label}</p>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function EditEntryModal() {
  const { editingOfferingId, setEditingOfferingId, entries, updateEntry } = useSchedulerStore()
  const { data: allSlots = [], isLoading: slotsLoading } = useTimeSlots()
  const { data: allRooms = [], isLoading: roomsLoading } = useRooms()

  const entry = entries.find(e => e.offeringId === editingOfferingId)
  const isOpen = editingOfferingId !== null && !!entry

  // Draft state
  const [draftSlotIds, setDraftSlotIds] = useState<number[]>([])
  const [draftSlots, setDraftSlots] = useState<TimeSlot[]>([])
  const [draftRoomId, setDraftRoomId] = useState<number>(0)
  const [draftRoomName, setDraftRoomName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'room' | 'time'>('room')

  // Reset draft when entry opens
  useEffect(() => {
    if (!entry) return
    setDraftSlotIds(entry.timeSlotIds)
    setDraftSlots(entry.timeSlots)
    setDraftRoomId(entry.roomId)
    setDraftRoomName(entry.roomName)
    setActiveTab('room')  // room is primary edit target
  }, [entry?.offeringId])

  const neededCount = entry?.timeSlotIds.length ?? 1
  const isLoading = slotsLoading || roomsLoading

  // Live conflict preview for current draft
  const { roomConflicts, lecturerConflicts } = useMemo(() => {
    if (!entry) return { roomConflicts: [], lecturerConflicts: [] }
    return previewConflicts(entry.offeringId, draftSlots, draftRoomId, entries)
  }, [entry, draftSlots, draftRoomId, entries])

  const hasConflicts = roomConflicts.length > 0 || lecturerConflicts.length > 0

  const isDirty = !!entry && (
    JSON.stringify([...draftSlotIds].sort()) !== JSON.stringify([...entry.timeSlotIds].sort()) ||
    draftRoomId !== entry.roomId
  )

  function handleApply() {
    if (!entry) return
    updateEntry(entry.offeringId, {
      timeSlots: draftSlots,
      timeSlotIds: draftSlotIds,
      roomId: draftRoomId,
      roomName: draftRoomName,
    })
    setEditingOfferingId(null)
  }

  function handleReset() {
    if (!entry) return
    setDraftSlotIds(entry.timeSlotIds)
    setDraftSlots(entry.timeSlots)
    setDraftRoomId(entry.roomId)
    setDraftRoomName(entry.roomName)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingOfferingId(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Slide-in panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] z-50 flex flex-col"
            style={{ background: 'rgba(10,13,22,0.97)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="p-5 border-b border-white/8 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 p-2 rounded-lg bg-primary-500/15 text-primary-400 shrink-0">
                    <Pencil size={15} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white truncate">{entry!.courseName}</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Manually adjust this entry</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge variant="default" className="text-[10px]">ID {entry!.offeringId}</Badge>
                      {entry!.locked && <Badge variant="info" className="text-[10px]">🔒 Locked</Badge>}
                      {entry!.lecturerNames.map(n => (
                        <Badge key={n} variant="purple" className="text-[10px]">{n}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingOfferingId(null)}
                  className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/8 shrink-0"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Drag tip */}
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/4 border border-white/6 px-3 py-2">
                <GripVertical size={13} className="text-primary-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-snug">
                  <span className="text-primary-300 font-medium">Tip:</span> You can also drag the course card directly on the schedule grid to move its time slot.
                  Use this panel to reassign the room or fine-tune time slots.
                </p>
              </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-3 border-b border-white/8 shrink-0">
              {([
                { id: 'room', label: 'Room', icon: MapPin },
                { id: 'time', label: 'Time Slots', icon: Clock },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-primary-600/25 text-primary-300 border border-primary-500/30'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
                  )}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Live conflict banner ─────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {hasConflicts && (
                <motion.div
                  key="conflict-banner"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="mx-3 mt-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3 space-y-1">
                    <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1.5">
                      <XCircle size={12} /> Conflicts with current assignment
                    </p>
                    {[...roomConflicts, ...lecturerConflicts].slice(0, 4).map((msg, i) => (
                      <p key={i} className="text-[10px] text-red-300 leading-snug">• {msg}</p>
                    ))}
                  </div>
                </motion.div>
              )}
              {!hasConflicts && isDirty && (
                <motion.div
                  key="ok-banner"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden shrink-0"
                >
                  <div className="mx-3 mt-2 rounded-xl bg-green-500/10 border border-green-500/25 px-3 py-2">
                    <p className="text-[11px] text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> No conflicts with the current selection
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Body ────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="space-y-2 pt-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-9 rounded-xl shimmer" />
                  ))}
                </div>
              ) : (
                <>
                  {/* ── Room tab ── */}
                  {activeTab === 'room' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SectionHeader
                        icon={MapPin}
                        label="Select Room"
                        sub={draftRoomName && `→ ${draftRoomName}`}
                      />
                      <RoomPicker
                        allRooms={allRooms}
                        selectedRoomId={draftRoomId}
                        offeringId={entry!.offeringId}
                        draftSlots={draftSlots}
                        entries={entries}
                        onChange={room => { setDraftRoomId(room.id); setDraftRoomName(room.name) }}
                      />
                    </motion.div>
                  )}

                  {/* ── Time tab ── */}
                  {activeTab === 'time' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary-500/8 border border-primary-500/20 px-3 py-2">
                        <Info size={12} className="text-primary-400 shrink-0" />
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Select {neededCount} slot{neededCount > 1 ? 's' : ''}. Red = would conflict. Or drag cards directly on the grid.
                        </p>
                      </div>
                      <SectionHeader
                        icon={Clock}
                        label="Time Slots"
                        sub={<Badge variant={draftSlotIds.length === neededCount ? 'success' : 'warning'}>
                          {draftSlotIds.length}/{neededCount}
                        </Badge>}
                      />
                      <SlotPicker
                        allSlots={allSlots}
                        neededCount={neededCount}
                        selectedIds={draftSlotIds}
                        offeringId={entry!.offeringId}
                        draftRoomId={draftRoomId}
                        entries={entries}
                        onChange={(ids, slots) => { setDraftSlotIds(ids); setDraftSlots(slots) }}
                      />
                    </motion.div>
                  )}

                  {/* ── Lecturers (read-only) ── */}
                  <div className="mt-5 pt-4 border-t border-white/6">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={12} className="text-slate-500" />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lecturers</p>
                      <Lock size={10} className="text-slate-600" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {entry!.lecturerNames.map(n => (
                        <Badge key={n} variant="default" className="text-[10px]">{n}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="p-4 border-t border-white/8 space-y-2 shrink-0">
              <Button
                variant={hasConflicts ? 'warning' : 'primary'}
                className="w-full"
                disabled={!isDirty || isLoading || draftSlotIds.length !== neededCount}
                onClick={handleApply}
              >
                {hasConflicts
                  ? '⚠ Apply (conflict will remain)'
                  : isDirty
                  ? 'Apply Changes'
                  : 'No changes'}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-500"
                onClick={handleReset}
                disabled={!isDirty}
              >
                Reset to GA assignment
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
