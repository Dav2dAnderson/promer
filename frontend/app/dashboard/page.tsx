'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { TaskCard } from '@/components/ui/TaskCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Folder, CheckSquare, Send, Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { Project, Task } from '@/types'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState({ totalProjects: 0, activeTasks: 0, pendingApplications: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsRes = await api.get<Project[]>('/management/projects/')
        setProjects(projectsRes.data.slice(0, 5))
        
        // Fetch tasks from first project if available
        if (projectsRes.data.length > 0) {
          const tasksRes = await api.get<Task[]>(`/management/projects/${projectsRes.data[0].slug}/tasks/`)
          setTasks(tasksRes.data.slice(0, 5))
        }
        
        setStats({
          totalProjects: projectsRes.data.length,
          activeTasks: tasks.filter(t => t.status !== 'done').length,
          pendingApplications: 0,
        })
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        // 401 errors are handled by axios interceptor - no redirect needed here
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const StatCard = ({ title, value, icon: Icon }: { title: string; value: number; icon: any }) => (
    <div className="bg-surface border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="text-accent" size={24} />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Dashboard']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Dashboard']}>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Projects" value={stats.totalProjects} icon={Folder} />
          <StatCard title="Active Tasks" value={stats.activeTasks} icon={CheckSquare} />
          <StatCard title="Pending Applications" value={stats.pendingApplications} icon={Send} />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          {user?.is_manager && (
            <Button href="/projects/new" className="gap-2">
              <Plus size={18} />
              New Project
            </Button>
          )}
          <Button variant="secondary" href="/projects">
            Browse Projects
          </Button>
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState message="No projects yet" icon={<Folder size={48} />} />
          )}
        </div>

        {/* Recent Tasks */}
        {tasks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <TaskCard key={task.slug} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}