import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(time: string) {
  return time.slice(0, 5)
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function getDayIndex(day: string): number {
  return DAYS.indexOf(day)
}

export function conflictSeverityColor(severity: 'HARD' | 'SOFT') {
  return severity === 'HARD' ? 'text-red-400' : 'text-amber-400'
}

export function statusFromViolations(hard: number, soft: number) {
  if (hard === 0 && soft === 0) return { label: 'Feasible', color: 'text-green-400', icon: '✅' }
  if (hard === 0) return { label: 'Near-feasible', color: 'text-amber-400', icon: '⚠️' }
  return { label: 'Invalid', color: 'text-red-400', icon: '❌' }
}
