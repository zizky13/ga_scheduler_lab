import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, CheckCircle2, XCircle, Activity, Layers, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useSchedulerStore } from '@/store/schedulerStore'
import { statusFromViolations } from '@/lib/utils'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="glass rounded-xl p-4 flex items-center gap-4"
    >
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </motion.div>
  )
}

export function SummaryPanel() {
  const { gaResult, preGASummary, diversity, conflicts } = useSchedulerStore()

  if (!gaResult) return null

  const hardCount = conflicts.filter(c => c.severity === 'HARD').length
  const softCount = gaResult.softPenalty
  const status = statusFromViolations(hardCount, softCount)
  const fitness = gaResult.bestFitness?.toFixed(4) ?? '—'

  const diversityColor = {
    LOW: 'bg-red-500/20 text-red-400',
    MEDIUM: 'bg-amber-500/20 text-amber-400',
    HIGH: 'bg-green-500/20 text-green-400',
  }[diversity?.rating ?? 'MEDIUM']

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        aria-label="Schedule summary"
      >
        {/* Status */}
        <Card animate={false} className={`col-span-2 md:col-span-1 rounded-xl flex items-center gap-4 ${
          hardCount === 0 && softCount === 0
            ? 'border-green-500/30 bg-green-500/8'
            : hardCount === 0
            ? 'border-amber-500/30 bg-amber-500/8'
            : 'border-red-500/30 bg-red-500/8'
        }`}>
          <div className={`p-2.5 rounded-lg ${
            hardCount === 0 && softCount === 0 ? 'bg-green-500/20 text-green-400'
            : hardCount === 0 ? 'bg-amber-500/20 text-amber-400'
            : 'bg-red-500/20 text-red-400'
          }`}>
            {hardCount === 0 && softCount === 0
              ? <CheckCircle2 size={20} />
              : hardCount === 0
              ? <AlertTriangle size={20} />
              : <XCircle size={20} />}
          </div>
          <div>
            <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
            <p className="text-xs text-slate-400">Schedule Status</p>
          </div>
        </Card>

        <StatCard
          label="Hard Violations"
          value={hardCount}
          icon={XCircle}
          color={hardCount === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          delay={0.05}
        />
        <StatCard
          label="Soft Violations"
          value={softCount}
          icon={AlertTriangle}
          color={softCount === 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}
          delay={0.1}
        />
        <StatCard
          label="Best Fitness"
          value={fitness}
          icon={TrendingUp}
          color="bg-primary-500/20 text-primary-400"
          delay={0.15}
        />

        {/* Infeasible offerings */}
        {preGASummary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            <div className="p-2.5 rounded-lg bg-violet-500/20 text-violet-400">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{preGASummary.feasible}</p>
              <p className="text-xs text-slate-400">Feasible Offerings</p>
            </div>
            {preGASummary.infeasible > 0 && (
              <Badge variant="danger" className="ml-auto">{preGASummary.infeasible} skipped</Badge>
            )}
          </motion.div>
        )}

        {/* Diversity */}
        {diversity && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-lg ${diversityColor}`}>
              <Activity size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-white capitalize">{diversity.rating.toLowerCase()}</p>
              <p className="text-xs text-slate-400">Population Diversity</p>
            </div>
            <Badge variant="default" className="ml-auto text-xs">{diversity.uniqueSlotCount} slots</Badge>
          </motion.div>
        )}
      </motion.section>
    </AnimatePresence>
  )
}
