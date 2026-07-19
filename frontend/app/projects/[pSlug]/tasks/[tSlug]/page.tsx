'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'
import { CommentThread } from '@/components/ui/CommentThread'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Check, ArrowLeft, User, Calendar, MessageSquare, Link } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/axios'
import type { Task, Comment } from '@/types'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pSlug = params.pSlug as string
  const tSlug = params.tSlug as string

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [taskRes, commentsRes] = await Promise.all([
          api.get<Task>(`/management/projects/${pSlug}/tasks/${tSlug}/`),
          api.get<Comment[]>(`/management/projects/${pSlug}/tasks/${tSlug}/comments/`),
        ])
        setTask(taskRes.data)
        setComments(commentsRes.data)
      } catch (error) {
        console.error('Failed to fetch task data:', error)
        // Don't redirect on 401 - axios interceptor handles that
        if (error && typeof error === 'object' && 'response' in error && 
            error.response && typeof error.response === 'object' && 
            'status' in error.response) {
          if (error.response.status === 401) {
            // 401 handled by axios interceptor
            return
          } else if (error.response.status === 500) {
            setError('Server error occurred. Please try again later.')
          } else if (error.response.status === 404) {
            setError('Task not found.')
          } else {
            setError('Failed to load task. Please try again.')
          }
        } else {
          setError('Network error. Please check your connection.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [pSlug, tSlug])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await api.post(`/management/projects/${pSlug}/tasks/${tSlug}/comments/`, {
        content: newComment,
        github_url: githubUrl || undefined,
      })
      setNewComment('')
      setGithubUrl('')
      // Refresh comments
      const res = await api.get<Comment[]>(`/management/projects/${pSlug}/tasks/${tSlug}/comments/`)
      setComments(res.data)
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!confirm('Mark this task as done?')) return

    setIsCompleting(true)
    try {
      await api.patch(`/management/projects/${pSlug}/tasks/${tSlug}/complete/`)
      // Refresh task
      const res = await api.get<Task>(`/management/projects/${pSlug}/tasks/${tSlug}/`)
      setTask(res.data)
    } catch (error) {
      console.error('Failed to mark task as complete:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const isAssignee = user?.id === task?.to_user.id

  if (isLoading) {
    return (
      <MainLayout breadcrumb={['Projects', 'Tasks', 'Loading...']}>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout breadcrumb={['Projects', 'Tasks', 'Error']}>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <EmptyState message={error} />
          <Button
            variant="secondary"
            onClick={() => router.push(`/projects/${pSlug}`)}
          >
            Back to Project
          </Button>
        </div>
      </MainLayout>
    )
  }

  if (!task) {
    return (
      <MainLayout breadcrumb={['Projects', 'Tasks', 'Not Found']}>
        <EmptyState message="Task not found" />
      </MainLayout>
    )
  }

  return (
    <MainLayout breadcrumb={['Projects', pSlug, 'Tasks', task.title]}>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          variant="secondary"
          onClick={() => router.push(`/projects/${pSlug}`)}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          Back to Project
        </Button>

        {/* Task Header */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{task.title}</h1>
                <StatusBadge variant={task.status}>{task.status}</StatusBadge>
              </div>
              <p className="text-gray-400">{task.description}</p>
            </div>
            {isAssignee && task.status !== 'done' && (
              <Button
                onClick={handleMarkComplete}
                isLoading={isCompleting}
                className="gap-2"
              >
                <Check size={18} />
                Mark as Done
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-400">Assigned to:</span>
              <span className="font-medium">{task.to_user.username}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-400">Created by:</span>
              <span className="font-medium">{task.from_user.username}</span>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-gray-400">Due:</span>
                <span className="font-medium">{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} />
            <h2 className="text-lg font-semibold">Comments</h2>
            <span className="text-gray-400 text-sm">({comments.length})</span>
          </div>

          <CommentThread comments={comments} />

          {/* Comment Form */}
          <form onSubmit={handleSubmitComment} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Add a comment
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-accent resize-none"
                placeholder="Write your comment..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                GitHub URL (optional)
              </label>
              <div className="relative">
                <Link size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
            <Button type="submit" isLoading={isSubmitting}>
              Post Comment
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}