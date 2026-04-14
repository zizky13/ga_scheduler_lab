import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Settings2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { GAConfig } from '@/types'

const DEFAULTS: Required<GAConfig> = {
  populationSize: 200,
  generations: 70,
  tournamentSize: 3,
  mutationRate: 0.30,
  elitismCount: 2,
  crossover: 'singlePoint',
}

interface SliderFieldProps {
  label: string
  name: keyof GAConfig
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (name: keyof GAConfig, value: number) => void
}

function SliderField({ label, name, value, min, max, step, format, onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs text-slate-300 font-medium">{label}</label>
        <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
          {format ? format(value) : value}
        </span>
      </div>
      <div className="relative">
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(name, parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-1.5"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

interface GAConfigModalProps {
  open: boolean
  onClose: () => void
  onRun: (config: GAConfig, mode: 'run' | 'compare') => void
  isRunning: boolean
}

export function GAConfigModal({ open, onClose, onRun, isRunning }: GAConfigModalProps) {
  const [config, setConfig] = useState<Required<GAConfig>>({ ...DEFAULTS })

  useEffect(() => {
    if (open) setConfig({ ...DEFAULTS })
  }, [open])

  function handleChange(name: keyof GAConfig, value: number | string) {
    setConfig(prev => ({ ...prev, [name]: value }))
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col glass border-l border-white/8"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary-500/15 text-primary-400">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">GA Configuration</h2>
                  <p className="text-[11px] text-slate-500">Tune the genetic algorithm parameters</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <SliderField
                label="Population Size"
                name="populationSize"
                value={config.populationSize}
                min={50} max={500} step={10}
                onChange={handleChange}
              />
              <SliderField
                label="Generations"
                name="generations"
                value={config.generations}
                min={10} max={200} step={5}
                onChange={handleChange}
              />
              <SliderField
                label="Tournament Size"
                name="tournamentSize"
                value={config.tournamentSize}
                min={2} max={10} step={1}
                onChange={handleChange}
              />
              <SliderField
                label="Mutation Rate"
                name="mutationRate"
                value={config.mutationRate}
                min={0.01} max={0.99} step={0.01}
                format={v => `${(v * 100).toFixed(0)}%`}
                onChange={handleChange}
              />
              <SliderField
                label="Elitism Count"
                name="elitismCount"
                value={config.elitismCount}
                min={0} max={10} step={1}
                onChange={handleChange}
              />

              {/* Crossover strategy */}
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-2">Crossover Strategy</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['singlePoint', 'uniform', 'pmx'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => handleChange('crossover', s)}
                      className={cn(
                        'rounded-lg py-2 px-2 text-[11px] font-medium border transition-all',
                        config.crossover === s
                          ? 'bg-primary-600/30 border-primary-500/50 text-primary-300'
                          : 'glass-light border-white/8 text-slate-400 hover:border-white/20',
                      )}
                    >
                      {s === 'singlePoint' ? 'Single Point' : s === 'uniform' ? 'Uniform' : 'PMX'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-1.5">Used only in Run mode (not Compare)</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-white/8 space-y-2">
              <Button
                variant="primary"
                className="w-full"
                leftIcon={<Zap size={14} />}
                loading={isRunning}
                onClick={() => onRun(config, 'run')}
              >
                Run GA
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                loading={isRunning}
                onClick={() => onRun(config, 'compare')}
              >
                Compare All Strategies
              </Button>
              <button
                onClick={() => setConfig({ ...DEFAULTS })}
                className="w-full text-[11px] text-slate-500 hover:text-slate-300 transition-colors py-1"
              >
                Reset to defaults
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
