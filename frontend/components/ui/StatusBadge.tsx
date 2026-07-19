import React from 'react'
import type { ManagerRequestStatus, TaskStatus } from '@/types'

type StatusBadgeProps = {
  variant: TaskStatus | 'accepted' | 'approved' | 'rejected' | ManagerRequestStatus
  children: React.ReactNode
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  const colors = {
    done: 'bg-green-500/10 text-green-400 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'in-progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  } as const

  const normalizedVariant = variant === 'in_progress' ? 'in-progress' : variant
  const colorClass = colors[normalizedVariant as keyof typeof colors] ?? colors.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colorClass}`}>
      {children}
    </span>
  )
}