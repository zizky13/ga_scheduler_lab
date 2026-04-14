import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Lock, Unlock, Clock, MapPin, User } from 'lucide-react'
import { useSchedulerStore } from '@/store/schedulerStore'
import { DAYS, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ScheduleEntry, TimeSlot } from '@/types'

// Group entries by day
function groupByDay(entries: ScheduleEntry[]): Record<string, ScheduleEntry[]> {
  const map: Record<string, ScheduleEntry[]> = {}
  DAYS.forEach(d => { map[d] = [] })
  entries.forEach(entry => {
    entry.timeSlots.forEach(ts => {
      if (!map[ts.day]) map[ts.day] = []
      // Avoid duplicates (multi-slot entries appear once per day they occur)
      if (!map[ts.day].some(e => e.offeringId === entry.offeringId)) {
        map[ts.day].push(entry)
      }
    })
  })
  return map
}

function EntryCard({ entry, isHighlighted }: { entry: ScheduleEntry; isHighlighted: boolean }) {
  const { toggleLock, conflicts } = useSchedulerStore()
  const [expanded, setExpanded] = useState(false)

  const entryConflicts = conflicts.filter(c => c.relatedOfferingIds.includes(entry.offeringId))
  const hasHard = entryConflicts.some(c => c.severity === 'HARD')
  const hasSoft = !hasHard && entryConflicts.some(c => c.severity === 'SOFT')

  const cellClass = cn(
    'relative rounded-xl border p-2.5 cursor-pointer transition-all duration-150 group',
    hasHard
      ? 'cell-hard border-red-500/40'
      : hasSoft
      ? 'cell-soft border-amber-500/40'
      : 'cell-ok border-green-500/30',
    isHighlighted && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-surface-900',
    entry.locked && 'opacity-80',
  )

  const timeDisplay = entry.timeSlots
    .map(ts => `${ts.day.slice(0, 3)} ${formatTime(ts.startTime)}`)
    .join(', ')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={cellClass}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Conflict indicator dot */}
      {(hasHard || hasSoft) && (
        <span className={cn(
          'absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-surface-900',
          hasHard ? 'bg-red-400' : 'bg-amber-400',
        )} />
      )}

      {/* Lock badge */}
      {entry.locked && (
        <span className="absolute top-1.5 right-1.5 text-primary-400">
          <Lock size={11} />
        </span>
      )}

      {/* Course name */}
      <p className={cn(
        'text-xs font-semibold leading-tight truncate',
        hasHard ? 'text-red-300' : hasSoft ? 'text-amber-300' : 'text-green-300',
      )}>
        {entry.courseName}
      </p>

      {/* Compact info */}
      <p className="text-[10px] text-slate-400 truncate mt-0.5">
        {entry.lecturerNames[0] ?? '—'}
      </p>
      <p className="text-[10px] text-slate-500 truncate">{entry.roomName}</p>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pt-2 border-t border-white/8 space-y-1 overflow-hidden"
          >
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              <Clock size={9} />
              <span>{timeDisplay}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              <MapPin size={9} />
              <span>{entry.roomName}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-300">
              <User size={9} />
              <span>{entry.lecturerNames.join(', ')}</span>
            </div>

            {/* Lock toggle */}
            <button
              onClick={e => { e.stopPropagation(); toggleLock(entry.offeringId) }}
              className={cn(
                'mt-1 flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 transition-colors',
                entry.locked
                  ? 'text-primary-400 bg-primary-500/15 hover:bg-primary-500/25'
                  : 'text-slate-400 bg-white/5 hover:bg-white/10',
              )}
            >
              {entry.locked ? <Lock size={9} /> : <Unlock size={9} />}
              {entry.locked ? 'Locked' : 'Lock entry'}
            </button>

            {/* Conflict hints */}
            {entryConflicts.map(c => (
              <p key={c.id} className={cn(
                'text-[10px] rounded px-1.5 py-0.5',
                c.severity === 'HARD' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400',
              )}>
                {c.description}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ScheduleGrid() {
  const { entries, highlightedOfferingIds } = useSchedulerStore()

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <div className="text-4xl">📅</div>
        <p className="text-sm">No schedule generated yet. Run the GA to see results here.</p>
      </div>
    )
  }

  const byDay = groupByDay(entries)

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-5 gap-3 min-w-[720px]">
        {DAYS.map((day, di) => (
          <motion.div
            key={day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: di * 0.06, duration: 0.3 }}
          >
            {/* Day header */}
            <div className="glass rounded-xl px-3 py-2 mb-2 text-center">
              <p className="text-xs font-semibold text-slate-200">{day}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{byDay[day].length} classes</p>
            </div>

            {/* Entries */}
            <div className="space-y-2">
              {byDay[day].length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/8 h-16 flex items-center justify-center">
                  <p className="text-[10px] text-slate-600">No classes</p>
                </div>
              ) : (
                byDay[day]
                  .sort((a, b) => {
                    const at = a.timeSlots.find(ts => ts.day === day)?.startTime ?? ''
                    const bt = b.timeSlots.find(ts => ts.day === day)?.startTime ?? ''
                    return at.localeCompare(bt)
                  })
                  .map(entry => (
                    <EntryCard
                      key={`${day}-${entry.offeringId}`}
                      entry={entry}
                      isHighlighted={highlightedOfferingIds.has(entry.offeringId)}
                    />
                  ))
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
