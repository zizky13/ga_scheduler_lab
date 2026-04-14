import { motion, AnimatePresence } from 'motion/react'
import { XCircle, X } from 'lucide-react'
import { useSchedulerStore } from '@/store/schedulerStore'

export function ErrorToast() {
  const { runError, setError } = useSchedulerStore()

  return (
    <AnimatePresence>
      {runError && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 glass border border-red-500/30 bg-red-500/10 text-red-300 rounded-2xl px-5 py-3.5 shadow-xl shadow-red-900/30 max-w-md w-full mx-4"
        >
          <XCircle size={18} className="shrink-0 text-red-400" />
          <p className="text-sm flex-1">{runError}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200 transition-colors"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
