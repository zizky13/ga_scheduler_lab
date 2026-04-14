import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, XCircle, ChevronDown, Pencil } from 'lucide-react'
import { useSchedulerStore } from '@/store/schedulerStore'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { Conflict } from '@/types'

function ConflictItem({ conflict, isSelected }: { conflict: Conflict; isSelected: boolean }) {
  const { selectConflict, setEditingOfferingId, entries } = useSchedulerStore()
  const isHard = conflict.severity === 'HARD'

  // Resolve entry names for the fix buttons
  const involvedEntries = conflict.relatedOfferingIds
    .map(id => entries.find(e => e.offeringId === id))
    .filter(Boolean) as NonNullable<typeof entries[0]>[]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'w-full text-left rounded-xl border transition-all duration-150 overflow-hidden',
        isSelected
          ? isHard
            ? 'bg-red-500/12 border-red-500/35'
            : 'bg-amber-500/12 border-amber-500/35'
          : 'glass-light border-white/5',
      )}
    >
      {/* Header row — click to expand */}
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => selectConflict(isSelected ? null : conflict.id)}
        className="w-full text-left p-3"
      >
        <div className="flex items-start gap-2.5">
          <div className={cn(
            'mt-0.5 shrink-0 rounded-md p-1',
            isHard ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400',
          )}>
            {isHard ? <XCircle size={13} /> : <AlertTriangle size={13} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <Badge variant={isHard ? 'danger' : 'warning'} className="text-[10px] shrink-0">
                {isHard ? 'HARD' : 'SOFT'}
              </Badge>
              <Badge variant="default" className="text-[10px] shrink-0">
                {conflict.type.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-snug">{conflict.description}</p>
            {conflict.day && (
              <p className="text-[10px] text-slate-500 mt-1">
                {conflict.day} · {conflict.time}
              </p>
            )}
          </div>
          <ChevronDown
            size={14}
            className={cn(
              'shrink-0 text-slate-500 transition-transform mt-0.5',
              isSelected && 'rotate-180',
            )}
          />
        </div>
      </motion.button>

      {/* Expanded section */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-white/8 space-y-2.5">
              <p className="text-[11px] text-slate-500 pt-2.5">
                Resolve by editing a conflicting entry below:
              </p>

              {/* Fix buttons for each involved entry */}
              {involvedEntries.map(e => (
                <div
                  key={e.offeringId}
                  className="flex items-center justify-between gap-2 rounded-lg glass-light p-2 border border-white/6"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{e.courseName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{e.roomName}</p>
                  </div>
                  {e.locked ? (
                    <Badge variant="info" className="shrink-0">🔒 Locked</Badge>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pencil size={11} />}
                      onClick={() => {
                        setEditingOfferingId(e.offeringId)
                        selectConflict(null)
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              ))}

              <p className="text-[10px] text-slate-600">
                Conflict-causing slots are highlighted red in the edit panel.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ConflictPanel() {
  const { conflicts, selectedConflictId, gaResult } = useSchedulerStore()

  if (!gaResult) return null

  const hardConflicts = conflicts.filter(c => c.severity === 'HARD')
  const softConflicts = conflicts.filter(c => c.severity === 'SOFT')

  return (
    <div className="space-y-4" aria-label="Conflicts panel">
      {/* Header stats */}
      <div className="flex gap-2">
        <div className="flex-1 glass rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-red-400">{hardConflicts.length}</p>
          <p className="text-[10px] text-slate-500">Hard</p>
        </div>
        <div className="flex-1 glass rounded-xl px-3 py-2 text-center">
          <p className="text-xl font-bold text-amber-400">{softConflicts.length}</p>
          <p className="text-[10px] text-slate-500">Soft</p>
        </div>
      </div>

      {conflicts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 gap-2"
        >
          <span className="text-3xl">✅</span>
          <p className="text-sm text-green-400 font-medium">No conflicts detected</p>
          <p className="text-xs text-slate-500">Schedule is feasible</p>
        </motion.div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-440px)] overflow-y-auto pr-1">
          {hardConflicts.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                Hard Violations
              </p>
              {hardConflicts.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <ConflictItem conflict={c} isSelected={selectedConflictId === c.id} />
                </motion.div>
              ))}
            </>
          )}

          {softConflicts.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 mt-4">
                Soft Violations
              </p>
              {softConflicts.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <ConflictItem conflict={c} isSelected={selectedConflictId === c.id} />
                </motion.div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
