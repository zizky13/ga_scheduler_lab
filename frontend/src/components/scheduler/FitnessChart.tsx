import { motion } from 'motion/react'
import { useSchedulerStore } from '@/store/schedulerStore'

export function FitnessChart() {
  const { gaResult } = useSchedulerStore()
  if (!gaResult?.history?.length) return null

  const data = gaResult.history
  const maxVal = Math.max(...data)
  const minVal = Math.min(...data)
  const range = maxVal - minVal || 1

  const W = 280
  const H = 80
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - minVal) / range) * H
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Fitness History</p>
      <div className="relative overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fitnessGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a6cf7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4a6cf7" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Fill area */}
          <motion.polygon
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            points={`0,${H} ${pts} ${W},${H}`}
            fill="url(#fitnessGrad)"
          />
          {/* Line */}
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            points={pts}
            fill="none"
            stroke="#6b8ffb"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>Gen 1</span>
        <span className="text-primary-400">Best: {Math.min(...data).toFixed(2)}</span>
        <span>Gen {data.length}</span>
      </div>
    </div>
  )
}
