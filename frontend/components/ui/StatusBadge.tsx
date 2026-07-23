import React from 'react'
import type { ManagerRequestStatus, TaskStatus } from '@/types'

type StatusBadgeProps = {
  variant: TaskStatus | 'accepted' | 'approved' | 'rejected' | ManagerRequestStatus
  children: React.ReactNode
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  const colors = {
    done: 'bg-emerald/10 text-emerald border-emerald/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    'in-progress': 'bg-warning/10 text-warning border-warning/20',
    in_progress: 'bg-warning/10 text-warning border-warning/20',
    accepted: 'bg-emerald/10 text-emerald border-emerald/20',
    approved: 'bg-emerald/10 text-emerald border-emerald/20',
    rejected: 'bg-danger/10 text-danger border-danger/20',
  } as const

  const normalizedVariant = variant === 'in_progress' ? 'in-progress' : variant
  const colorClass = colors[normalizedVariant as keyof typeof colors] ?? colors.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-medium rounded-full border ${colorClass}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
