import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Zap, RefreshCw, Trash2, Download, Settings2, Activity, Brain
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GAConfigModal } from '@/components/scheduler/GAConfigModal'
import { useSchedulerStore } from '@/store/schedulerStore'
import { schedulerApi } from '@/lib/api'
import type { GAConfig } from '@/types'

interface HeaderProps {
  semester?: string
  academicYear?: string
}

export function Header({ semester = 'Ganjil', academicYear = '2024/2025' }: HeaderProps) {
  const [configOpen, setConfigOpen] = useState(false)
  const { isRunning, setRunning, setResults, setError, clearResults, gaResult, conflicts } = useSchedulerStore()

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

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass border-b border-white/8 px-6 py-4 flex items-center gap-4 sticky top-0 z-30"
        role="banner"
      >
        {/* Logo + Title */}
        <div className="flex items-center gap-3 mr-4">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 shadow-lg shadow-primary-900/40">
              <Brain size={20} className="text-white" />
            </div>
            {isRunning && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 pulse-ring" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold gradient-text">GA Scheduler</h1>
            <p className="text-[10px] text-slate-500">Genetic Algorithm Course Planner</p>
          </div>
        </div>

        {/* Context badges */}
        <div className="flex items-center gap-2 flex-1">
          <Badge variant="purple" dot>{academicYear}</Badge>
          <Badge variant="info" dot>{semester}</Badge>
          {gaResult && (
            <Badge variant={hardCount === 0 ? 'success' : 'danger'} dot>
              {hardCount === 0 ? 'Feasible' : `${hardCount} Hard`}
            </Badge>
          )}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs text-primary-400"
            >
              <Activity size={12} className="animate-pulse" />
              <span>Running GA…</span>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2" aria-label="Quick actions">
          <Button
            id="btn-generate"
            variant="primary"
            size="sm"
            leftIcon={<Zap size={14} />}
            loading={isRunning}
            onClick={() => setConfigOpen(true)}
          >
            Generate
          </Button>

          {gaResult && (
            <>
              <Button
                id="btn-optimize-again"
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                loading={isRunning}
                onClick={() => handleRun({}, 'run')}
              >
                Optimize Again
              </Button>

              <Button
                id="btn-export"
                variant="ghost"
                size="icon"
                title="Export (coming soon)"
                onClick={() => alert('Export feature coming soon!')}
              >
                <Download size={15} />
              </Button>

              <Button
                id="btn-reset"
                variant="ghost"
                size="icon"
                title="Reset schedule"
                onClick={clearResults}
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}

          <Button
            id="btn-config"
            variant="ghost"
            size="icon"
            title="Configure GA"
            onClick={() => setConfigOpen(true)}
          >
            <Settings2 size={15} />
          </Button>
        </nav>
      </motion.header>

      <GAConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onRun={handleRun}
        isRunning={isRunning}
      />
    </>
  )
}
