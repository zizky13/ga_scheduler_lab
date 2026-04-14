import { motion } from 'motion/react'
import { Zap, Brain, CalendarDays, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EmptyStateProps {
  onGenerate: () => void
}

const features = [
  { icon: Brain, label: 'Genetic Algorithm', desc: 'Evolves optimal schedules over generations' },
  { icon: CalendarDays, label: 'Conflict Detection', desc: 'Room & lecturer clash auto-detection' },
  { icon: GitMerge, label: 'Compare Strategies', desc: 'Benchmark Single-Point, Uniform & PMX' },
]

export function EmptyState({ onGenerate }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8 px-4"
    >
      {/* Hero icon */}
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="p-6 rounded-3xl bg-gradient-to-br from-primary-600/25 to-violet-600/25 border border-primary-500/20 glow-primary"
        >
          <Brain size={56} className="text-primary-400" />
        </motion.div>
        {/* Orbiting dots */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute h-2 w-2 rounded-full bg-primary-400"
            animate={{ rotate: 360 }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.8,
            }}
            style={{
              top: '50%',
              left: '50%',
              originX: `${(i + 2) * 25}px`,
              originY: '0px',
              x: (i + 2) * 25,
              y: -4,
            }}
          />
        ))}
      </div>

      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          Genetic Algorithm Scheduler
        </h2>
        <p className="text-slate-400 text-sm max-w-sm">
          Generate near-optimal course schedules using evolutionary algorithms.
          Detect conflicts, apply fixes, and export results.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3">
        {features.map(({ icon: Icon, label, desc }) => (
          <motion.div
            key={label}
            whileHover={{ y: -2, scale: 1.02 }}
            className="glass rounded-xl p-4 flex items-start gap-3 text-left max-w-[200px]"
          >
            <div className="p-2 rounded-lg bg-primary-500/15 text-primary-400 shrink-0">
              <Icon size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">{label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Button
        id="btn-start-generate"
        variant="primary"
        size="lg"
        leftIcon={<Zap size={18} />}
        onClick={onGenerate}
        className="glow-primary"
      >
        Generate Schedule
      </Button>
    </motion.div>
  )
}
