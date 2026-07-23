'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus, Folder, Search, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { Project } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        try {
          const allRes = await api.get<Project[]>('/management/projects/')
          setProjects(allRes.data)
        } catch (error) {
          console.error('Failed to fetch all projects:', error)
        }

        try {
          const mineRes = await api.get<Project[]>('/management/projects/?my_projects=true')
          setMyProjects(mineRes.data)
        } catch (error) {
          console.error('Failed to fetch my projects:', error)
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const displayedProjects = activeTab === 'all' ? projects : myProjects

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Projects']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Projects']}>
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div><p className="eyebrow mb-2">Workspace / Registry</p><h1 className="text-3xl font-semibold tracking-tight">Projects</h1><p className="mt-2 text-zinc-400">Track initiatives, teams, and delivery in one place.</p></div>
          {user?.is_manager && (
            <Button href="/projects/new" className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-cyan border-b-2 border-cyan'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'mine'
                ? 'text-cyan border-b-2 border-cyan'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            My Projects
          </button></div>
          <div className="flex items-center gap-3"><div className="flex items-center gap-2 rounded-md border border-white/10 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500"><Search size={14} /> Search projects</div><button className="rounded-md border border-white/10 p-2 text-zinc-500 hover:text-white" title="Filter projects"><SlidersHorizontal size={15} /></button></div>
        </div>

        {/* Projects Grid */}
        {displayedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        ) : (
          <EmptyState
            message={activeTab === 'all' ? 'No projects available' : 'You have no projects yet'}
            icon={<Folder size={48} />}
          />
        )}
      </div>
    </MainLayout>
  )
}
