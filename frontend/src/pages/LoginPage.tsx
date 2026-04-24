import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2, Cpu } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError, user } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ username: false, password: false })

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    }
  }, [user, navigate, location.state])

  // Clear API error whenever the user edits fields
  useEffect(() => {
    if (error) clearError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password])

  const canSubmit = username.trim().length > 0 && password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ username: true, password: true })
    if (!canSubmit) return
    await login(username.trim(), password)
  }

  return (
    <div className="min-h-dvh animated-gradient flex flex-col items-center justify-center relative overflow-hidden px-4">

      {/* Background orbs — identical to SchedulerPage */}
      <div className="orb h-96 w-96 bg-primary-600 top-0 left-[10%]" />
      <div className="orb h-80 w-80 bg-violet-600 bottom-[20%] right-[5%]" />
      <div className="orb h-64 w-64 bg-sky-600 top-[40%] left-[60%]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="p-3 rounded-2xl glass glow-primary">
            <Cpu size={28} className="text-primary-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold gradient-text">GA Scheduler</h1>
            <p className="text-sm text-slate-400 mt-1">Genetic Algorithm Course Planner</p>
          </div>
        </div>

        {/* Login card */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Sign in to continue</h2>
            <p className="text-sm text-slate-400 mt-0.5">Enter your credentials to access the scheduler.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, username: true }))}
                  placeholder="your_username"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-800 border border-white/8 text-sm text-white placeholder:text-slate-600
                    focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              {touched.username && !username.trim() && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Username is required
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-surface-800 border border-white/8 text-sm text-white placeholder:text-slate-600
                    focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {touched.password && !password && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Password is required
                </p>
              )}
            </div>

            {/* API error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="api-error"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 relative flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm
                bg-primary-600 hover:bg-primary-500 active:bg-primary-700
                text-white shadow-lg shadow-primary-900/40 glow-primary
                transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          GA Scheduler · Thesis Project · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
