'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { TaskCard } from '@/components/ui/TaskCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CheckSquare, Users, Send, Settings, Plus, Trash2, Calendar, Building2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { Project, Task, Application, Department } from '@/types'

type Tab = 'tasks' | 'departments' | 'applications' | 'settings'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('tasks')
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const pSlug = params.pSlug as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectRes, tasksRes, applicationsRes, departmentsRes] = await Promise.all([
          api.get<Project>(`/management/projects/${pSlug}/`),
          api.get<Task[]>(`/management/projects/${pSlug}/tasks/`),
          api.get<Application[]>(`/management/projects/${pSlug}/applications/`),
          api.get<Department[]>(`/management/projects/${pSlug}/departments/`),
        ])
        setProject(projectRes.data)
        setTasks(tasksRes.data)
        setApplications(applicationsRes.data)
        setDepartments(departmentsRes.data)
      } catch (error) {
        console.error('Failed to fetch project data:', error)
        // Don't redirect on 401 - axios interceptor handles that
        if (error && typeof error === 'object' && 'response' in error && 
            error.response && typeof error.response === 'object' && 
            'status' in error.response && error.response.status !== 401) {
          router.push('/projects')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [pSlug, router])

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return

    setIsDeleting(true)
    try {
      await api.delete(`/management/projects/${pSlug}/`)
      router.push('/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
      setIsDeleting(false)
    }
  }

  const handleAcceptApplication = async (appSlug: string) => {
    try {
      await api.patch(`/management/received-applications/${appSlug}/accept/`)
      // Refresh applications
      const res = await api.get<Application[]>(`/management/projects/${pSlug}/applications/`)
      setApplications(res.data)
    } catch (error) {
      console.error('Failed to accept application:', error)
    }
  }

  const handleRejectApplication = async (appSlug: string) => {
    try {
      await api.patch(`/management/received-applications/${appSlug}/reject/`)
      // Refresh applications
      const res = await api.get<Application[]>(`/management/projects/${pSlug}/applications/`)
      setApplications(res.data)
    } catch (error) {
      console.error('Failed to reject application:', error)
    }
  }

  const isOwner = user?.id === project?.owner.id

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Projects', 'Loading...']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (!project) {
    return (
      <MainLayout breadcrumb={['Projects', 'Not Found']}>
        <EmptyState message="Project not found" />
      </MainLayout>
    )
  }

  const tabs = [
    { id: 'tasks' as Tab, label: 'Tasks', icon: CheckSquare },
    { id: 'departments' as Tab, label: 'Departments', icon: Building2 },
    { id: 'applications' as Tab, label: 'Applications', icon: Send },
    ...(isOwner ? [{ id: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
  ]

  return (
    <MainLayout breadcrumb={['Projects', project.name]}>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
              <p className="text-gray-400 mb-4">{project.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Started: {new Date(project.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>{project.contributors?.length || 0} contributors</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-medium">
                {project.owner.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{project.owner.username}</p>
                <p className="text-xs text-gray-400">Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-surface border border-border rounded-lg p-6">
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tasks</h2>
                {isOwner && (
                  <Button className="gap-2">
                    <Plus size={18} />
                    New Task
                  </Button>
                )}
              </div>
              {tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((task) => (
                    <TaskCard key={task.slug} task={task} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No tasks yet" icon={<CheckSquare size={48} />} />
              )}
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Departments</h2>
                {isOwner && (
                  <Button className="gap-2">
                    <Plus size={18} />
                    New Department
                  </Button>
                )}
              </div>
              {departments.length > 0 ? (
                <div className="space-y-3">
                  {departments.map((dept) => (
                    <div key={dept.slug} className="bg-background border border-border rounded-lg p-4">
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="text-gray-400 text-sm">{dept.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No departments yet" icon={<Building2 size={48} />} />
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {isOwner ? 'Received Applications' : 'My Application'}
              </h2>
              {isOwner ? (
                applications.length > 0 ? (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div key={app.slug} className="bg-background border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{app.title}</h3>
                            <p className="text-sm text-gray-400">{app.applicant.username}</p>
                          </div>
                          <StatusBadge variant={app.status}>{app.status}</StatusBadge>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{app.content}</p>
                        {app.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptApplication(app.slug)}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRejectApplication(app.slug)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No applications received" icon={<Send size={48} />} />
                )
              ) : (
                <div>
                  {applications.length > 0 ? (
                    <div className="bg-background border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{applications[0].title}</h3>
                        <StatusBadge variant={applications[0].status}>
                          {applications[0].status}
                        </StatusBadge>
                      </div>
                      <p className="text-gray-300 text-sm">{applications[0].content}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">You haven't applied to this project</p>
                      <Button>Apply to Project</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Project Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
                  <input
                    type="text"
                    defaultValue={project.name}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    defaultValue={project.description}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-white resize-none"
                  />
                </div>
                <Button>Save Changes</Button>
              </div>
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
                <Button
                  variant="danger"
                  onClick={handleDeleteProject}
                  isLoading={isDeleting}
                  className="gap-2"
                >
                  <Trash2 size={18} />
                  Delete Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}