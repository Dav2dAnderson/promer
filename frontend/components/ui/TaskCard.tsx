import React from 'react'
import Link from 'next/link'
import { User, Calendar } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  projectSlug?: string
}

export function TaskCard({ task }: TaskCardProps) {
  const slug = typeof task.project === 'string' ? task.project : task.project.slug
  
  return (
    <Link
      href={`/projects/${slug}/tasks/${task.slug}`}
      className="group block surface-panel p-5 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold group-hover:text-cyan transition-colors">{task.title}</h3>
        <StatusBadge variant={task.status}>{task.status}</StatusBadge>
      </div>
      
      <p className="text-zinc-400 text-sm mb-5 line-clamp-2 leading-6">{task.description}</p>
      
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <User size={16} />
          <span>{task.to_user.username}</span>
        </div>
        {task.due_date && (
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
