'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { CheckSquare, Users, Send, Settings, Plus, Trash2, Calendar, Building2, Edit2, MoreVertical, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { Project, Task, Application, Department, CreateTaskRequest, UpdateTaskRequest, ProjectFormData, CreateDepartmentRequest, UpdateDepartmentRequest } from '@/types'

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
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; username: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Task creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskToUser, setNewTaskToUser] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  
  // Task update state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDescription, setEditTaskDescription] = useState('')
  const [editTaskToUser, setEditTaskToUser] = useState('')
  const [editTaskDueDate, setEditTaskDueDate] = useState('')
  const [editTaskStatus, setEditTaskStatus] = useState('')
  
  // Task deletion state
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  
  // Task action menu state
  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null)

  // Application creation state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applicationTitle, setApplicationTitle] = useState('')
  const [applicationDescription, setApplicationDescription] = useState('')
  
  // Project editing state
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [projectFormData, setProjectFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    is_public: false,
  })
  
  // Department CRUD state
  const [isCreateDeptModalOpen, setIsCreateDeptModalOpen] = useState(false)
  const [isCreatingDept, setIsCreatingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptDescription, setNewDeptDescription] = useState('')
  
  const [isEditDeptModalOpen, setIsEditDeptModalOpen] = useState(false)
  const [isEditingDept, setIsEditingDept] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [editDeptName, setEditDeptName] = useState('')
  const [editDeptDescription, setEditDeptDescription] = useState('')
  
  const [isDeletingDept, setIsDeletingDept] = useState(false)
  const [activeDeptMenu, setActiveDeptMenu] = useState<string | null>(null)

  const pSlug = params.pSlug as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectRes = await api.get<Project>(`/management/projects/${pSlug}/`)
        setProject(projectRes.data)

        // Fetch other data independently so permission errors don't break the whole page
        api.get<Task[]>(`/management/projects/${pSlug}/tasks/`)
          .then(res => setTasks(res.data))
          .catch(err => console.error('Failed to fetch tasks:', err))

        api.get<Application[]>(`/management/projects/${pSlug}/applications/`)
          .then(res => setApplications(res.data))
          .catch(err => console.error('Failed to fetch applications:', err))

        api.get<Department[]>(`/management/projects/${pSlug}/departments/`)
          .then(res => setDepartments(res.data))
          .catch(err => console.error('Failed to fetch departments:', err))

        // Set available users (owner + contributors)
        if (projectRes.data) {
          const users = [
            { id: projectRes.data.owner.id, username: projectRes.data.owner.username },
            ...(projectRes.data.contributors || []).map(c => ({ id: c.id, username: c.username }))
          ]
          setAvailableUsers(users)
          
          // Initialize project form data
          setProjectFormData({
            name: projectRes.data.name,
            description: projectRes.data.description,
            is_public: projectRes.data.is_public,
          })
        }
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

  // Close dropdown when clicking outside
  const handleOutsideClick = useCallback(() => {
    setActiveTaskMenu(null)
    setActiveDeptMenu(null)
  }, [])

  useEffect(() => {
    if (activeTaskMenu || activeDeptMenu) {
      document.addEventListener('click', handleOutsideClick)
      return () => document.removeEventListener('click', handleOutsideClick)
    }
  }, [activeTaskMenu, activeDeptMenu, handleOutsideClick])

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

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applicationTitle.trim() || !applicationDescription.trim()) return

    setIsApplying(true)
    setErrorMessage(null)
    try {
      await api.post(`/management/projects/${pSlug}/applications/`, {
        title: applicationTitle,
        description: applicationDescription,
      })
      const res = await api.get<Application[]>(`/management/projects/${pSlug}/applications/`)
      setApplications(res.data)
      setApplicationTitle('')
      setApplicationDescription('')
      setIsApplyModalOpen(false)
    } catch (error) {
      console.error('Failed to submit application:', error)
      setErrorMessage('Failed to submit application. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !newTaskToUser) return

    setIsCreating(true)
    try {
      const createData: CreateTaskRequest = {
        title: newTaskTitle,
        description: newTaskDescription,
        to_user_id: Number(newTaskToUser),
        due_date: newTaskDueDate || undefined,
      }
      await api.post(`/management/projects/${pSlug}/tasks/`, createData)
      // Refresh tasks
      const res = await api.get<Task[]>(`/management/projects/${pSlug}/tasks/`)
      setTasks(res.data)
      // Reset form and close modal
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskToUser('')
      setNewTaskDueDate('')
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setEditTaskTitle(task.title)
    setEditTaskDescription(task.description)
    setEditTaskToUser(task.to_user.id.toString())
    setEditTaskDueDate(task.due_date || '')
    setEditTaskStatus(task.status)
    setIsEditModalOpen(true)
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask || !editTaskTitle.trim() || !editTaskToUser) return

    setIsEditing(true)
    try {
      const updateData: UpdateTaskRequest = {
        title: editTaskTitle,
        description: editTaskDescription,
        to_user_id: Number(editTaskToUser),
        due_date: editTaskDueDate || undefined,
        status: editTaskStatus as any,
      }
      await api.patch(`/management/projects/${pSlug}/tasks/${editingTask.slug}/`, updateData)
      // Refresh tasks
      const res = await api.get<Task[]>(`/management/projects/${pSlug}/tasks/`)
      setTasks(res.data)
      // Reset form and close modal
      setEditingTask(null)
      setEditTaskTitle('')
      setEditTaskDescription('')
      setEditTaskToUser('')
      setEditTaskDueDate('')
      setEditTaskStatus('')
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteTask = async (taskSlug: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    setIsDeletingTask(true)
    try {
      await api.delete(`/management/projects/${pSlug}/tasks/${taskSlug}/`)
      // Refresh tasks
      const res = await api.get<Task[]>(`/management/projects/${pSlug}/tasks/`)
      setTasks(res.data)
    } catch (error) {
      console.error('Failed to delete task:', error)
    } finally {
      setIsDeletingTask(false)
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectFormData.name.trim()) return

    setIsEditingProject(true)
    try {
      await api.patch(`/management/projects/${pSlug}/`, projectFormData)
      // Refresh project data
      const res = await api.get<Project>(`/management/projects/${pSlug}/`)
      setProject(res.data)
      setIsEditingProject(false)
    } catch (error) {
      console.error('Failed to update project:', error)
      setIsEditingProject(false)
    }
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeptName.trim()) return

    setIsCreatingDept(true)
    try {
      const createData: CreateDepartmentRequest = {
        name: newDeptName,
        description: newDeptDescription,
      }
      await api.post(`/management/projects/${pSlug}/departments/`, createData)
      // Refresh departments
      const res = await api.get<Department[]>(`/management/projects/${pSlug}/departments/`)
      setDepartments(res.data)
      // Reset form and close modal
      setNewDeptName('')
      setNewDeptDescription('')
      setIsCreateDeptModalOpen(false)
    } catch (error) {
      console.error('Failed to create department:', error)
    } finally {
      setIsCreatingDept(false)
    }
  }

  const handleEditDepartment = (dept: Department) => {
    setEditingDept(dept)
    setEditDeptName(dept.name)
    setEditDeptDescription(dept.description)
    setIsEditDeptModalOpen(true)
  }

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDept || !editDeptName.trim()) return

    setIsEditingDept(true)
    try {
      const updateData: UpdateDepartmentRequest = {
        name: editDeptName,
        description: editDeptDescription,
      }
      await api.patch(`/management/projects/${pSlug}/departments/${editingDept.slug}/`, updateData)
      // Refresh departments
      const res = await api.get<Department[]>(`/management/projects/${pSlug}/departments/`)
      setDepartments(res.data)
      // Reset form and close modal
      setEditingDept(null)
      setEditDeptName('')
      setEditDeptDescription('')
      setIsEditDeptModalOpen(false)
    } catch (error) {
      console.error('Failed to update department:', error)
    } finally {
      setIsEditingDept(false)
    }
  }

  const handleDeleteDepartment = async (deptSlug: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    setIsDeletingDept(true)
    try {
      await api.delete(`/management/projects/${pSlug}/departments/${deptSlug}/`)
      // Refresh departments
      const res = await api.get<Department[]>(`/management/projects/${pSlug}/departments/`)
      setDepartments(res.data)
    } catch (error) {
      console.error('Failed to delete department:', error)
    } finally {
      setIsDeletingDept(false)
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
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Project Header */}
        <div className="surface-panel p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow mb-3">Project / {project.slug}</p>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">{project.name}</h1>
              <p className="text-zinc-400 mb-5 max-w-2xl leading-6">{project.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>Started: {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span>{project.contributors?.length || 0} contributors</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-sm font-medium text-emerald-300">
                {project.owner.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{project.owner.username}</p>
                <p className="text-xs text-zinc-500">Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/[0.08] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-cyan border-b-2 border-cyan'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="surface-panel p-6">
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tasks</h2>
                {isOwner && (
                  <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus size={18} />
                    New Task
                  </Button>
                )}
              </div>
              {tasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => {
                    const slug = typeof task.project === 'string' ? task.project : task.project.slug
                    return (
                      <div key={task.slug} className="relative group">
                        <div className="bg-zinc-950/35 border border-white/[0.08] rounded-lg p-5 hover:border-violet-400/40 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <Link
                              href={`/projects/${slug}/tasks/${task.slug}`}
                              className="flex-1"
                            >
                              <h3 className="font-semibold hover:text-violet-300 transition-colors text-base">{task.title}</h3>
                            </Link>
                            <div className="flex items-center gap-2 ml-2">
                              <StatusBadge variant={task.status}>{task.status}</StatusBadge>
                              {isOwner && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveTaskMenu(activeTaskMenu === task.slug ? null : task.slug)
                                    }}
                                    className="p-1.5 hover:bg-background rounded-lg transition-colors"
                                  >
                                    <MoreVertical size={16} className="text-gray-400" />
                                  </button>
                                  {activeTaskMenu === task.slug && (
                                    <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-xl z-10 min-w-[120px] overflow-hidden">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditTask(task)
                                          setActiveTaskMenu(null)
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-background flex items-center gap-2 transition-colors"
                                      >
                                        <Edit2 size={14} />
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteTask(task.slug)
                                          setActiveTaskMenu(null)
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-background text-red-400 flex items-center gap-2 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-zinc-400 text-sm mb-4 line-clamp-2 min-h-[2.5rem] leading-6">{task.description}</p>
                          
                          <div className="flex items-center justify-between text-xs text-zinc-500 pt-3 border-t border-white/[0.08]">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                                <User size={12} className="text-accent" />
                              </div>
                              <span className="font-medium">{task.to_user.username}</span>
                            </div>
                            {task.due_date && (
                              <div className="flex items-center gap-2 px-2 py-1 bg-background rounded">
                                <Calendar size={14} className="text-gray-400" />
                                <span className="text-xs">{new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
                  <Button onClick={() => setIsCreateDeptModalOpen(true)} className="gap-2">
                    <Plus size={18} />
                    New Department
                  </Button>
                )}
              </div>
              {departments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept) => (
                    <div key={dept.slug} className="relative group">
                      <div className="bg-surface border border-border rounded-lg p-5 hover:border-accent hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{dept.name}</h3>
                          </div>
                          {isOwner && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveDeptMenu(activeDeptMenu === dept.slug ? null : dept.slug)
                                }}
                                className="p-1.5 hover:bg-background rounded-lg transition-colors"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                              {activeDeptMenu === dept.slug && (
                                <div className="absolute right-0 top-8 bg-surface border border-border rounded-lg shadow-xl z-10 min-w-[120px] overflow-hidden">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditDepartment(dept)
                                      setActiveDeptMenu(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-background flex items-center gap-2 transition-colors"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteDepartment(dept.slug)
                                      setActiveDeptMenu(null)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-background text-red-400 flex items-center gap-2 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2 min-h-[2.5rem]">{dept.description}</p>
                      </div>
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
                            <p className="text-sm text-gray-400">{app.user.username}</p>
                          </div>
                          <StatusBadge variant={app.status}>{app.status}</StatusBadge>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{app.description}</p>
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
                      <p className="text-gray-300 text-sm">{applications[0].description}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">You haven't applied to this project</p>
                      <Button onClick={() => setIsApplyModalOpen(true)}>Apply to Project</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && isOwner && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Project Settings</h2>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
                    <input
                      type="text"
                      value={projectFormData.name}
                      onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={projectFormData.description}
                      onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="edit_is_public"
                      checked={projectFormData.is_public}
                      onChange={(e) => setProjectFormData({ ...projectFormData, is_public: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent"
                    />
                    <label htmlFor="edit_is_public" className="text-sm text-gray-300">
                      Make this project public
                    </label>
                  </div>
                </div>
                <Button type="submit" isLoading={isEditingProject}>
                  Save Changes
                </Button>
              </form>
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

      {/* Create Task Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => {
          setIsApplyModalOpen(false)
          setErrorMessage(null)
        }}
        title="Apply to Project"
      >
        <form onSubmit={handleCreateApplication} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={applicationTitle}
                onChange={(e) => setApplicationTitle(e.target.value)}
                placeholder="How would you like to contribute?"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={applicationDescription}
                onChange={(e) => setApplicationDescription(e.target.value)}
                rows={4}
                placeholder="Share your background and what you can help with..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
                required
              />
            </div>
          </div>
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {errorMessage}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isApplying} className="px-5">
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                rows={4}
                placeholder="Describe the task..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assign to User *
                </label>
                <select
                  value={newTaskToUser}
                  onChange={(e) => setNewTaskToUser(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required
                >
                  <option value="">Select a user</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating} className="px-5">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Task"
      >
        <form onSubmit={handleUpdateTask} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editTaskDescription}
                onChange={(e) => setEditTaskDescription(e.target.value)}
                rows={4}
                placeholder="Describe the task..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assign to User *
                </label>
                <select
                  value={editTaskToUser}
                  onChange={(e) => setEditTaskToUser(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  required
                >
                  <option value="">Select a user</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editTaskDueDate}
                  onChange={(e) => setEditTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={editTaskStatus}
                onChange={(e) => setEditTaskStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isEditing} className="px-5">
              Update Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Department Modal */}
      <Modal
        isOpen={isCreateDeptModalOpen}
        onClose={() => setIsCreateDeptModalOpen(false)}
        title="Create New Department"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department Name *
              </label>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="Enter department name..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newDeptDescription}
                onChange={(e) => setNewDeptDescription(e.target.value)}
                rows={4}
                placeholder="Describe the department..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateDeptModalOpen(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingDept} className="px-5">
              Create Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={isEditDeptModalOpen}
        onClose={() => setIsEditDeptModalOpen(false)}
        title="Edit Department"
      >
        <form onSubmit={handleUpdateDepartment} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Department Name *
              </label>
              <input
                type="text"
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
                placeholder="Enter department name..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editDeptDescription}
                onChange={(e) => setEditDeptDescription(e.target.value)}
                rows={4}
                placeholder="Describe the department..."
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditDeptModalOpen(false)}
              className="px-5"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isEditingDept} className="px-5">
              Update Department
            </Button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  )
}
