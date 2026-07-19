'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Plus, Folder } from 'lucide-react'
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
        const [allRes, mineRes] = await Promise.all([
          api.get<Project[]>('/management/projects/'),
          api.get<Project[]>('/management/projects/?my_projects=true'),
        ])
        setProjects(allRes.data)
        setMyProjects(mineRes.data)
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
          {user?.is_manager && (
            <Button href="/projects/new" className="gap-2">
              <Plus size={18} />
              New Project
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'mine'
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Projects
          </button>
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