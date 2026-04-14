import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LayoutGrid, AlertTriangle, BarChart2, Database } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SummaryPanel } from '@/components/scheduler/SummaryPanel'
import { ScheduleGrid } from '@/components/scheduler/ScheduleGrid'
import { ConflictPanel } from '@/components/scheduler/ConflictPanel'
import { FitnessChart } from '@/components/scheduler/FitnessChart'
import { EmptyState } from '@/components/scheduler/EmptyState'
import { GAConfigModal } from '@/components/scheduler/GAConfigModal'
import { RunningOverlay } from '@/components/ui/RunningOverlay'
import { ErrorToast } from '@/components/ui/ErrorToast'
import { EditEntryModal } from '@/components/scheduler/EditEntryModal'
import { useSchedulerStore } from '@/store/schedulerStore'
import { schedulerApi } from '@/lib/api'
import type { GAConfig } from '@/types'
import { cn } from '@/lib/utils'

type Tab = 'grid' | 'conflicts' | 'analytics'

export function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<Tab>('grid')
  const [configOpen, setConfigOpen] = useState(false)
  const { gaResult, isRunning, setRunning, setResults, setError, conflicts } = useSchedulerStore()

  const hardCount = conflicts.filter(c => c.severity === 'HARD').length

  async function handleRun(config: GAConfig, mode: 'run' | 'compare') {
    setConfigOpen(false)
    setRunning(true)
    try {
      if (mode === 'run') {
        const data = await schedulerApi.run(config)
        setResults(data.bestResult, data.preGASummary, data.diversity, data.config)
      } else {
        const data = await schedulerApi.compare(config)
        setResults(data.bestResult, data.preGASummary, data.diversity, data.config)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GA run failed'
      setError(msg)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'grid', label: 'Schedule', icon: LayoutGrid },
    { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle, badge: hardCount || undefined },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ]

  return (
    <div className="min-h-dvh animated-gradient flex flex-col relative">
      {/* Background orbs */}
      <div className="orb h-96 w-96 bg-primary-600 top-0 left-[10%]" />
      <div className="orb h-80 w-80 bg-violet-600 bottom-[20%] right-[5%]" />
      <div className="orb h-64 w-64 bg-sky-600 top-[40%] left-[60%]" />

      <Header />

      <main className="flex-1 relative z-10 max-w-[1600px] mx-auto w-full px-6 py-6 space-y-6">
        {!gaResult ? (
          <EmptyState onGenerate={() => setConfigOpen(true)} />
        ) : (
          <>
            {/* Summary */}
            <SummaryPanel />

            {/* Tabs + content */}
            <div className="glass rounded-2xl overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center gap-1 p-1.5 border-b border-white/8 overflow-x-auto">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 relative whitespace-nowrap',
                        isActive
                          ? 'bg-primary-600/25 text-primary-300 border border-primary-500/25'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                      )}
                    >
                      <Icon size={15} />
                      {tab.label}
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center text-white">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab panels */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'grid' && (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ScheduleGrid />
                    </motion.div>
                  )}

                  {activeTab === 'conflicts' && (
                    <motion.div
                      key="conflicts"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ConflictPanel />
                        <div className="hidden lg:block">
                          <ScheduleGrid />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'analytics' && (
                    <motion.div
                      key="analytics"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <FitnessChart />
                      <AnalyticsPanel />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </main>

      <RunningOverlay />
      <ErrorToast />
      <EditEntryModal />

      <GAConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onRun={handleRun}
        isRunning={isRunning}
      />
    </div>
  )
}

function AnalyticsPanel() {
  const { gaResult, preGASummary, diversity, usedConfig, conflicts } = useSchedulerStore()
  if (!gaResult) return null

  const rows = [
    { label: 'Crossover Used', value: gaResult.crossoverUsed },
    { label: 'Population Size', value: usedConfig?.populationSize ?? '—' },
    { label: 'Generations', value: usedConfig?.generations ?? '—' },
    { label: 'Mutation Rate', value: usedConfig?.mutationRate ? `${(usedConfig.mutationRate * 100).toFixed(0)}%` : '—' },
    { label: 'Best Fitness', value: gaResult.bestFitness?.toFixed(6) ?? '—' },
    { label: 'Soft Penalty', value: gaResult.softPenalty },
    { label: 'Entries Scheduled', value: gaResult.entries.length },
    { label: 'Total Conflicts', value: conflicts.length },
    { label: 'Feasible Offerings', value: preGASummary?.feasible ?? '—' },
    { label: 'Infeasible Offerings', value: preGASummary?.infeasible ?? '—' },
    { label: 'Diversity Rating', value: diversity?.rating ?? '—' },
    { label: 'Unique Slot Count', value: diversity?.uniqueSlotCount ?? '—' },
  ]

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database size={15} className="text-primary-400" />
        <p className="text-xs font-semibold text-slate-300">Run Details</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="glass-light rounded-lg p-3">
            <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-white font-mono">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
