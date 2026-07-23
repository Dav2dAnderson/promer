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
      className="group block surface-panel p-5 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4"><h3 className="font-semibold text-lg mb-2 group-hover:text-cyan transition-colors">{project.name}</h3><span className="font-mono text-[10px] text-zinc-600">PRJ</span></div>
      <p className="text-zinc-400 text-sm mb-5 line-clamp-2 leading-6">{project.description}</p>
      
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>{project.contributors?.length || 0} contributors</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-xs font-medium text-emerald-300">
          {project.owner.username.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-gray-400">{project.owner.username}</span>
      </div>
    </Link>
  )
}
