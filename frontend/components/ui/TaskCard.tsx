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
      className="block bg-surface border border-border rounded-lg p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{task.title}</h3>
        <StatusBadge variant={task.status}>{task.status}</StatusBadge>
      </div>
      
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-400">
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