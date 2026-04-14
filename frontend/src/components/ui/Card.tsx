import React from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  animate?: boolean
}

export function Card({ children, className, hover, onClick, animate = true }: CardProps) {
  const base = cn(
    'glass rounded-2xl p-4',
    hover && 'cursor-pointer hover:border-white/15 hover:bg-white/5 transition-all duration-200',
    className,
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={base}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={base} onClick={onClick}>{children}</div>
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-slate-200', className)}>{children}</h3>
}
