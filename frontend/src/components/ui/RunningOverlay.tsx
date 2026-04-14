import { motion, AnimatePresence } from 'motion/react'
import { Brain } from 'lucide-react'
import { useSchedulerStore } from '@/store/schedulerStore'

const tips = [
  'Evaluating fitness across the population…',
  'Applying crossover to breed new candidates…',
  'Mutating chromosomes for diversity…',
  'Selecting elite individuals with tournament…',
  'Converging towards optimal schedule…',
]

export function RunningOverlay() {
  const { isRunning } = useSchedulerStore()

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
          aria-live="polite"
          aria-label="Running genetic algorithm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="glass rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-primary-500/20"
          >
            {/* Animated brain */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-primary-400"
              />
              <div className="p-5 rounded-full bg-gradient-to-br from-primary-600/30 to-violet-600/30 border border-primary-500/30">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Brain size={36} className="text-primary-400" />
                </motion.div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-1">GA Running</h3>
              <motion.p
                key={Date.now()}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-slate-400"
              >
                {tips[Math.floor(Math.random() * tips.length)]}
              </motion.p>
            </div>

            {/* Animated bar */}
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary-500 to-transparent rounded-full"
              />
            </div>

            <p className="text-[11px] text-slate-600">GA runs are CPU-intensive — please wait</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
