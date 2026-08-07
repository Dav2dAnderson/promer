"use client"

import React from 'react'
import { Users } from 'lucide-react'
import type { ProjectMemberGroup } from '@/types'

type Props = {
  groups: ProjectMemberGroup[]
}

export function MembersList({ groups }: Props) {
  if (!groups || groups.length === 0) {
    return <div className="text-sm text-gray-400">No members yet</div>
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.role}>
          <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
            <Users size={16} />
            <span>{g.role_display} ({g.members.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {g.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-background border border-border rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-sm font-medium text-emerald-300">
                  {m.username?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{m.username}</div>
                  <div className="text-xs text-zinc-500">{[m.first_name, m.last_name].filter(Boolean).join(' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MembersList
