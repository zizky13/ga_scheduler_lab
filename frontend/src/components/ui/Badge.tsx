import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-slate-300 border border-white/10',
  success: 'bg-green-500/15 text-green-400 border border-green-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  danger:  'bg-red-500/15 text-red-400 border border-red-500/25',
  info:    'bg-sky-500/15 text-sky-400 border border-sky-500/25',
  purple:  'bg-violet-500/15 text-violet-400 border border-violet-500/25',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[variant],
      className,
    )}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-slate-400':  variant === 'default',
          'bg-green-400':  variant === 'success',
          'bg-amber-400':  variant === 'warning',
          'bg-red-400':    variant === 'danger',
          'bg-sky-400':    variant === 'info',
          'bg-violet-400': variant === 'purple',
        })} />
      )}
      {children}
    </span>
  )
}
