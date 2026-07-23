'use client'

import React, { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { TaskCard } from '@/components/ui/TaskCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Folder, CheckSquare, Send, Plus, ArrowUpRight, Activity } from 'lucide-react'
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
        let fetchedTasks: Task[] = []
        if (projectsRes.data.length > 0) {
          try {
            const tasksRes = await api.get<Task[]>(`/management/projects/${projectsRes.data[0].slug}/tasks/`)
            fetchedTasks = tasksRes.data.slice(0, 5)
            setTasks(fetchedTasks)
          } catch (error) {
            console.error('Failed to fetch tasks:', error)
          }
        }
        
        setStats({
          totalProjects: projectsRes.data.length,
          activeTasks: fetchedTasks.filter(t => t.status !== 'done').length,
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
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="text-3xl font-semibold mt-3 tracking-tight">{value}</p>
        </div>
        <Icon className="text-cyan" size={20} />
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
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow mb-3">Overview / {new Date().toISOString().slice(0, 10)}</p><h1 className="text-3xl font-semibold tracking-tight">Good morning, {user?.first_name || user?.username}.</h1><p className="mt-2 text-zinc-400">Here’s what needs your attention across the workspace.</p></div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald"><span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_10px_rgba(0,229,153,0.8)]" />SYSTEMS OPERATIONAL</div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Projects" value={stats.totalProjects} icon={Folder} />
          <StatCard title="Active Tasks" value={stats.activeTasks} icon={CheckSquare} />
          <StatCard title="Pending Applications" value={stats.pendingApplications} icon={Send} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {user?.is_manager && (
            <Button href="/projects/new" className="gap-2">
              <Plus size={16} />
              New Project
            </Button>
          )}
          <Button variant="secondary" href="/projects">
            Browse Projects <ArrowUpRight size={16} />
          </Button>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow mb-1">Workspace activity</p><h2 className="text-xl font-semibold">Recent Projects</h2></div><Activity size={18} className="text-zinc-600" /></div>
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
