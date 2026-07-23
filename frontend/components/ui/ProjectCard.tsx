import React from 'react'
import Link from 'next/link'
import { Users, Calendar } from 'lucide-react'
import type { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block bg-surface border border-border rounded-lg p-4 hover:border-accent transition-colors"
    >
      <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>{project.contributors?.length || 0} contributors</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-medium">
          {project.owner.username.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-gray-400">{project.owner.username}</span>
      </div>
    </Link>
  )
}